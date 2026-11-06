import {
  type CreateReportInput,
  RATE_LIMITS,
  REPORT_LIMITS,
  type ReportReceipt,
} from '@supporters/shared';
import type { PrismaClient } from '../../generated/prisma/client';
import { invalidField, isUniqueViolation, notFound, rateLimited } from '../../lib/errors';
import type { SlidingWindowLimiter } from '../../lib/sliding-window';
import { recordEvent } from '../notifications/outbox';
import { type ReportTargets, reportLockKey } from './report-targets';

const DAY_SEC = 24 * 60 * 60;

export interface ReportResult {
  receipt: ReportReceipt;
  /** False when the reporter had already reported the same target. */
  isNew: boolean;
}

/** Reports from users (product spec, Feed and social: Moderation). Admins act on them. */
export class ReportsService {
  constructor(
    private readonly prisma: PrismaClient,
    readonly targets: ReportTargets,
    private readonly limiter: SlidingWindowLimiter,
  ) {}

  /**
   * Files a report, or returns the reporter's earlier one for the same target.
   * When a post or comment reaches 5 open reports from different people it is
   * hidden for admin review and its author is told. A per-target advisory lock
   * makes the count exact under concurrent reports.
   */
  async create(reporterId: string, input: CreateReportInput): Promise<ReportResult> {
    const target = this.targets.get(input.targetType);
    const loaded = target ? await target.load(input.targetId, reporterId) : null;
    if (!target || !loaded) throw notFound();
    if (loaded.subjectUserId === reporterId) {
      throw invalidField('body.targetId', "You can't report your own content");
    }

    const key = {
      reporterUserId: reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
    };
    const existing = await this.findExisting(key);
    if (existing) return { receipt: existing, isNew: false };

    const limit = await this.limiter.hit(
      `reports:${reporterId}`,
      RATE_LIMITS.reportsPerDay,
      DAY_SEC,
    );
    if (!limit.allowed) throw rateLimited(limit.resetMs / 1000);

    try {
      const report = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${reportLockKey(input.targetType, input.targetId)}, 0))`;
        const created = await tx.report.create({
          data: {
            ...key,
            subjectUserId: loaded.subjectUserId,
            reason: input.reason,
            details: input.details || null,
          },
          select: { id: true },
        });
        if (target.isAutoHidden) {
          const open = await tx.report.count({
            where: { targetType: input.targetType, targetId: input.targetId, status: 'open' },
          });
          if (
            open >= REPORT_LIMITS.autoHideDistinctReporters &&
            (await target.hide(tx, input.targetId))
          ) {
            await recordEvent(tx, 'content.hidden', {
              userId: loaded.subjectUserId,
              targetType: input.targetType,
              targetId: input.targetId,
            });
          }
        }
        return created;
      });
      return { receipt: { id: report.id }, isNew: true };
    } catch (error) {
      // The same person reporting twice at once: the first one stands.
      const raced = isUniqueViolation(error) ? await this.findExisting(key) : null;
      if (raced) return { receipt: raced, isNew: false };
      throw error;
    }
  }

  private findExisting(key: {
    reporterUserId: string;
    targetType: CreateReportInput['targetType'];
    targetId: string;
  }) {
    return this.prisma.report.findUnique({
      where: { reporterUserId_targetType_targetId: key },
      select: { id: true },
    });
  }
}
