import type { AuditLog, AuditLogsQuery, Page } from '@supporters/shared';
import type { FastifyRequest } from 'fastify';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { unauthenticated } from '../../lib/errors';
import { pageArgs, splitPage } from '../../lib/pagination';

/** The admin behind a request, with where it came from. */
export interface AdminActor {
  userId: string;
  ip: string;
  userAgent: string | null;
}

export const adminActor = (request: FastifyRequest): AdminActor => {
  if (!request.auth) throw unauthenticated();
  return {
    userId: request.auth.userId,
    ip: request.ip,
    userAgent: request.headers['user-agent']?.slice(0, 512) ?? null,
  };
};

export interface AuditEntry {
  /** `resource.verb`, e.g. `verification.approve`. */
  action: string;
  targetType?: string;
  targetId?: string;
  /** Ids, statuses and reasons only: never passwords, tokens, codes or document contents. */
  metadata?: Prisma.InputJsonObject;
}

/**
 * Appends one audit row. Pass the transaction of the change, so the row exists
 * exactly when the change commits (backend spec, Security: Admin).
 */
export async function writeAudit(
  db: Prisma.TransactionClient,
  actor: AdminActor,
  entry: AuditEntry,
): Promise<void> {
  await db.auditLog.create({
    data: {
      actorUserId: actor.userId,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      metadata: entry.metadata ?? {},
      ip: actor.ip,
      userAgent: actor.userAgent,
    },
  });
}

export class AuditLogService {
  constructor(private readonly prisma: PrismaClient) {}

  /** Newest first, filtered by actor, action or target. */
  async list(query: AuditLogsQuery): Promise<Page<AuditLog>> {
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.auditLog.findMany({
      ...page,
      where: {
        ...page.where,
        ...(query.actorId ? { actorUserId: query.actorId } : {}),
        ...(query.action ? { action: query.action } : {}),
        ...(query.targetType ? { targetType: query.targetType } : {}),
        ...(query.targetId ? { targetId: query.targetId } : {}),
      },
      include: { actor: { select: { id: true, name: true } } },
    });
    const split = splitPage(rows, query.limit);
    return {
      data: split.rows.map((row) => ({
        id: row.id,
        actor: row.actor,
        action: row.action,
        targetType: row.targetType,
        targetId: row.targetId,
        metadata: (row.metadata ?? {}) as Record<string, unknown>,
        ip: row.ip,
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor: split.nextCursor,
    };
  }
}
