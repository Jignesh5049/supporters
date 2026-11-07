import type {
  AdminReport,
  AdminReportsQuery,
  Page,
  ReportActionInput,
  ReportActionResult,
} from '@supporters/shared';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { AppError, ErrorCode, notFound } from '../../lib/errors';
import { recordEvent } from '../notifications/outbox';
import { type ReportTargets, type TargetPreview, reportLockKey } from '../reports/report-targets';
import type { AdminUsersService } from './admin-users.service';
import { type AdminActor, writeAudit } from './audit.service';
import { splitPage } from '../../lib/pagination';
import { queuePageArgs } from './queue-pagination';

const include = {
  reporter: { select: { id: true, name: true } },
} satisfies Prisma.ReportInclude;

const alreadyResolved = () =>
  new AppError(409, ErrorCode.Conflict, 'This report was already resolved', {
    detail: 'Reload the queue.',
  });
const cannotHide = () =>
  new AppError(409, ErrorCode.Conflict, 'This kind of content cannot be hidden yet');

const GONE: TargetPreview = {
  excerpt: null,
  isHidden: false,
  isDeleted: true,
  postId: null,
  businessSlug: null,
};

/** The report queue (product spec, Moderation): dismiss, hide, warn or suspend. */
export class AdminReportsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly targets: ReportTargets,
    private readonly users: AdminUsersService,
  ) {}

  /** Open reports oldest first; resolved ones newest first. */
  async list(query: AdminReportsQuery): Promise<Page<AdminReport>> {
    const isQueue = query.status === 'open';
    const page = queuePageArgs(query.cursor, query.limit, isQueue ? 'asc' : 'desc');
    const rows = await this.prisma.report.findMany({
      ...page,
      where: {
        ...page.where,
        status: query.status,
        ...(query.targetType ? { targetType: query.targetType } : {}),
      },
      include,
    });
    const split = splitPage(rows, query.limit);

    const subjects = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(split.rows.map((row) => row.subjectUserId))] } },
      select: { id: true, name: true, status: true },
    });
    const subjectBy = new Map(subjects.map((user) => [user.id, user]));
    const previews = new Map<string, TargetPreview>();
    for (const type of new Set(split.rows.map((row) => row.targetType))) {
      const ids = split.rows.filter((row) => row.targetType === type).map((row) => row.targetId);
      const described =
        (await this.targets.get(type)?.describe(ids)) ?? new Map<string, TargetPreview>();
      for (const [id, preview] of described) previews.set(`${type}:${id}`, preview);
    }
    const open = await this.prisma.report.groupBy({
      by: ['targetType', 'targetId'],
      where: {
        status: 'open',
        targetId: { in: [...new Set(split.rows.map((row) => row.targetId))] },
      },
      _count: { _all: true },
    });
    const openBy = new Map(
      open.map((row) => [`${row.targetType}:${row.targetId}`, row._count._all]),
    );

    return {
      data: split.rows.map((row) => {
        const key = `${row.targetType}:${row.targetId}`;
        const subject = subjectBy.get(row.subjectUserId);
        return {
          id: row.id,
          targetType: row.targetType,
          targetId: row.targetId,
          reason: row.reason,
          details: row.details,
          status: row.status,
          action: row.action,
          resolutionNote: row.resolutionNote,
          createdAt: row.createdAt.toISOString(),
          resolvedAt: row.resolvedAt?.toISOString() ?? null,
          reporter: row.reporter,
          subject: {
            id: row.subjectUserId,
            name: subject?.name ?? '',
            status: subject?.status ?? 'deleted',
          },
          target: previews.get(key) ?? GONE,
          openReportCount: openBy.get(key) ?? 0,
        };
      }),
      nextCursor: split.nextCursor,
    };
  }

  /**
   * Acts on a report and closes every open report on the same target with it.
   * Dismiss shows the target again if it was hidden; hide and suspend hide it
   * (telling the author); warn notifies the author; suspend also suspends them
   * and signs them out everywhere. Serialized with new reports on the target.
   */
  async act(
    actor: AdminActor,
    reportId: string,
    input: ReportActionInput,
  ): Promise<ReportActionResult> {
    const found = await this.prisma.report.findUnique({
      where: { id: reportId },
      select: { targetType: true, targetId: true },
    });
    if (!found) throw notFound();
    const target = this.targets.get(found.targetType);
    if (!target && input.action !== 'dismiss' && input.action !== 'warn') throw cannotHide();

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${reportLockKey(found.targetType, found.targetId)}, 0))`;
      const report = await tx.report.findUniqueOrThrow({ where: { id: reportId } });
      if (report.status !== 'open') throw alreadyResolved();
      const { targetType, targetId, subjectUserId } = report;

      const hide = async () => {
        if (target && (await target.hide(tx, targetId))) {
          await recordEvent(tx, 'content.hidden', { userId: subjectUserId, targetType, targetId });
        }
      };
      switch (input.action) {
        case 'dismiss':
          if (target) await target.unhide(tx, targetId);
          break;
        case 'hide':
          await hide();
          break;
        case 'warn':
          await recordEvent(tx, 'account.warned', { userId: subjectUserId, reportId });
          break;
        case 'suspend':
          await hide();
          await this.users.suspendIn(tx, actor, subjectUserId, { reportId });
          break;
      }

      const now = new Date();
      const { count } = await tx.report.updateMany({
        where: { targetType, targetId, status: 'open' },
        data: {
          status: input.action === 'dismiss' ? 'dismissed' : 'actioned',
          action: input.action,
          resolutionNote: input.note || null,
          resolvedByUserId: actor.userId,
          resolvedAt: now,
        },
      });
      await writeAudit(tx, actor, {
        action: `report.${input.action}`,
        targetType: 'report',
        targetId: reportId,
        metadata: { targetType, targetId, subjectUserId, resolvedCount: count },
      });
      return { subjectUserId, resolvedCount: count };
    });

    if (input.action === 'suspend') await this.users.signOutEverywhere(result.subjectUserId);
    const [preview] = (await target?.describe([found.targetId]))?.values() ?? [];
    const subject = await this.prisma.user.findUnique({
      where: { id: result.subjectUserId },
      select: { status: true },
    });
    return {
      resolvedCount: result.resolvedCount,
      isTargetHidden: preview?.isHidden ?? false,
      subjectStatus: subject?.status ?? 'deleted',
    };
  }
}
