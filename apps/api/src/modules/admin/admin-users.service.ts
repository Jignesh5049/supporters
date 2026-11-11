import {
  type AdminUser,
  type AdminUsersQuery,
  type Page,
  type SuspendUserInput,
  phoneSchema,
} from '@supporters/shared';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { AppError, ErrorCode, notFound } from '../../lib/errors';
import { pageArgs, splitPage } from '../../lib/pagination';
import type { SessionService } from '../auth/session.service';
import { recordSearchSync } from '../search/search.sync';
import { type AdminActor, writeAudit } from './audit.service';

/** `+91******1234`: enough to tell accounts apart without showing the number. */
export const maskPhone = (phone: string) =>
  `${phone.slice(0, 3)}${'*'.repeat(Math.max(0, phone.length - 7))}${phone.slice(-4)}`;

/** A suspended owner's business, listings and posts leave search (and return on restore). */
async function syncOwnedBusiness(tx: Prisma.TransactionClient, userId: string) {
  const business = await tx.business.findUnique({
    where: { ownerUserId: userId },
    select: { id: true },
  });
  if (business) await recordSearchSync(tx, 'business', business.id);
}

const cannotSuspendAdmin = () =>
  new AppError(409, ErrorCode.Conflict, 'Admin accounts cannot be suspended here', {
    detail: 'Remove admin access with scripts/create-admin.ts first.',
  });

export class AdminUsersService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly sessions: SessionService,
  ) {}

  /** Newest first. `q` is a full +91 number (exact) or part of a name. */
  async list(query: AdminUsersQuery): Promise<Page<AdminUser>> {
    const page = pageArgs(query.cursor, query.limit);
    const phone = query.q ? phoneSchema.safeParse(query.q) : null;
    const search: Prisma.UserWhereInput = !query.q
      ? {}
      : phone?.success
        ? { phone: phone.data }
        : { name: { contains: query.q, mode: 'insensitive' } };
    const rows = await this.prisma.user.findMany({
      ...page,
      where: { ...page.where, ...search, ...(query.status ? { status: query.status } : {}) },
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
        business: { select: { id: true, name: true, slug: true } },
      },
    });
    const split = splitPage(rows, query.limit);
    const counts = await this.prisma.report.groupBy({
      by: ['subjectUserId'],
      where: { subjectUserId: { in: split.rows.map((row) => row.id) }, status: 'open' },
      _count: { _all: true },
    });
    const openBy = new Map(counts.map((row) => [row.subjectUserId, row._count._all]));
    return {
      data: split.rows.map((row) => ({
        id: row.id,
        name: row.name,
        phone: maskPhone(row.phone),
        role: row.role,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
        business: row.business,
        openReportCount: openBy.get(row.id) ?? 0,
      })),
      nextCursor: split.nextCursor,
    };
  }

  /**
   * Suspends an account and signs it out everywhere: every session is revoked
   * (and its access tokens refused at once), and its business, posts and
   * listings drop out of public reads. Admins are refused.
   */
  async suspend(actor: AdminActor, userId: string, input: SuspendUserInput) {
    return this.setStatus(actor, userId, 'suspended', { reason: input.reason });
  }

  async restore(actor: AdminActor, userId: string) {
    return this.setStatus(actor, userId, 'active', {});
  }

  /** Used by report actions too, inside their transaction. */
  async suspendIn(
    tx: Prisma.TransactionClient,
    actor: AdminActor,
    userId: string,
    metadata: Prisma.InputJsonObject,
  ): Promise<boolean> {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user) throw notFound();
    if (user.role === 'admin') throw cannotSuspendAdmin();
    const { count } = await tx.user.updateMany({
      where: { id: userId, status: 'active' },
      data: { status: 'suspended' },
    });
    if (count === 1) {
      await syncOwnedBusiness(tx, userId);
      await writeAudit(tx, actor, {
        action: 'user.suspend',
        targetType: 'user',
        targetId: userId,
        metadata,
      });
    }
    return count === 1;
  }

  /** Revokes the sessions of a suspended account (after its transaction commits). */
  async signOutEverywhere(userId: string) {
    await this.sessions.revokeAllForUser(userId);
  }

  private async setStatus(
    actor: AdminActor,
    userId: string,
    status: 'active' | 'suspended',
    metadata: Prisma.InputJsonObject,
  ) {
    const changed = await this.prisma.$transaction(async (tx) => {
      if (status === 'suspended') return this.suspendIn(tx, actor, userId, metadata);
      const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!user) throw notFound();
      const { count } = await tx.user.updateMany({
        where: { id: userId, status: 'suspended' },
        data: { status: 'active' },
      });
      if (count === 1) {
        await syncOwnedBusiness(tx, userId);
        await writeAudit(tx, actor, {
          action: 'user.restore',
          targetType: 'user',
          targetId: userId,
        });
      }
      return count === 1;
    });
    // Also on a repeat call: a session issued in between is still signed out.
    if (status === 'suspended') await this.signOutEverywhere(userId);
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, status: true },
    });
    return { ...user, changed };
  }
}
