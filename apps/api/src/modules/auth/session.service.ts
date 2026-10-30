import { randomUUID } from 'node:crypto';
import type { FastifyBaseLogger } from 'fastify';
import type { Redis } from 'ioredis';
import type { PrismaClient } from '../../generated/prisma/client';
import { openWith, randomToken, sealWith, sha256 } from '../../lib/crypto';
import { AppError, ErrorCode } from '../../lib/errors';
import {
  ACCESS_TOKEN_TTL_SEC,
  REFRESH_GRACE_SEC,
  REFRESH_TOKEN_ABSOLUTE_TTL_SEC,
  REFRESH_TOKEN_TTL_SEC,
  revokedSessionKey,
} from './auth.constants';

const graceKey = (tokenHash: string) => `rt:grace:${tokenHash}`;

export interface ClientMeta {
  ip: string;
  userAgent: string | undefined;
}

export interface IssuedSession {
  userId: string;
  sessionId: string;
  role: 'user' | 'admin';
  refreshToken: string;
  refreshExpiresAt: Date;
}

const invalidRefreshToken = () =>
  new AppError(401, ErrorCode.InvalidRefreshToken, 'Session expired, sign in again');

const addSeconds = (date: Date, seconds: number) => new Date(date.getTime() + seconds * 1000);

export class SessionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly valkey: Redis,
    private readonly log: FastifyBaseLogger,
  ) {}

  async create(
    user: { id: string; role: 'user' | 'admin' },
    meta: ClientMeta,
  ): Promise<IssuedSession> {
    const refreshToken = randomToken();
    const now = new Date();
    const absoluteExpiresAt = addSeconds(now, REFRESH_TOKEN_ABSOLUTE_TTL_SEC);
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        familyId: randomUUID(),
        refreshTokenHash: sha256(refreshToken),
        expiresAt: addSeconds(now, REFRESH_TOKEN_TTL_SEC),
        absoluteExpiresAt,
        ip: meta.ip,
        userAgent: meta.userAgent?.slice(0, 512) ?? null,
      },
    });
    return {
      userId: user.id,
      sessionId: session.id,
      role: user.role,
      refreshToken,
      refreshExpiresAt: session.expiresAt,
    };
  }

  /**
   * Rotates a refresh token. The first request to present a token claims the
   * rotation in Valkey (SET NX) and parks the new token there for 10 s,
   * sealed with a key derived from the old token, so concurrent or retried
   * requests with the same old token get the same new token back. After the
   * grace window, presenting the replaced token is treated as theft and the
   * whole family is revoked.
   */
  async rotate(presented: string, meta: ClientMeta): Promise<IssuedSession> {
    const presentedHash = sha256(presented);
    const nextToken = randomToken();
    const claimed = await this.valkey.set(
      graceKey(presentedHash),
      sealWith(presented, nextToken),
      'EX',
      REFRESH_GRACE_SEC,
      'NX',
    );

    if (claimed !== 'OK') return this.replayRotation(presented, presentedHash);

    const now = new Date();
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: presentedHash },
      include: { user: { select: { role: true, status: true } } },
    });

    if (!session) {
      await this.valkey.del(graceKey(presentedHash));
      await this.detectReuse(presentedHash);
      throw invalidRefreshToken();
    }

    if (
      session.revokedAt ||
      session.expiresAt <= now ||
      session.absoluteExpiresAt <= now ||
      session.user.status !== 'active'
    ) {
      await this.valkey.del(graceKey(presentedHash));
      if (!session.revokedAt) await this.revoke(session.id);
      throw invalidRefreshToken();
    }

    const slidingExpiry = addSeconds(now, REFRESH_TOKEN_TTL_SEC);
    const expiresAt =
      slidingExpiry < session.absoluteExpiresAt ? slidingExpiry : session.absoluteExpiresAt;
    const { count } = await this.prisma.session.updateMany({
      where: { id: session.id, refreshTokenHash: presentedHash, revokedAt: null },
      data: {
        refreshTokenHash: sha256(nextToken),
        previousTokenHash: presentedHash,
        rotatedAt: now,
        expiresAt,
        lastUsedAt: now,
        ip: meta.ip,
        userAgent: meta.userAgent?.slice(0, 512) ?? null,
      },
    });
    if (count !== 1) {
      await this.valkey.del(graceKey(presentedHash));
      throw invalidRefreshToken();
    }

    return {
      userId: session.userId,
      sessionId: session.id,
      role: session.user.role,
      refreshToken: nextToken,
      refreshExpiresAt: expiresAt,
    };
  }

  /** Another request with the same token is rotating it, or did within the grace window. */
  private async replayRotation(presented: string, presentedHash: string): Promise<IssuedSession> {
    const sealed = await this.valkey.get(graceKey(presentedHash));
    const nextToken = sealed ? openWith(presented, sealed) : null;
    if (!nextToken) throw invalidRefreshToken();

    const session = await this.prisma.session.findFirst({
      where: {
        OR: [{ refreshTokenHash: presentedHash }, { previousTokenHash: presentedHash }],
        revokedAt: null,
      },
      include: { user: { select: { role: true, status: true } } },
    });
    if (!session || session.user.status !== 'active') throw invalidRefreshToken();

    return {
      userId: session.userId,
      sessionId: session.id,
      role: session.user.role,
      refreshToken: nextToken,
      refreshExpiresAt: session.expiresAt,
    };
  }

  private async detectReuse(presentedHash: string) {
    const rotated = await this.prisma.session.findUnique({
      where: { previousTokenHash: presentedHash },
      select: { id: true, userId: true, familyId: true, rotatedAt: true },
    });
    if (!rotated) return;
    // Inside the grace window the replay entry should have answered; if Valkey lost it,
    // fail this request without punishing a legitimate concurrent refresh.
    const graceEndsAt = (rotated.rotatedAt?.getTime() ?? 0) + REFRESH_GRACE_SEC * 1000;
    if (Date.now() < graceEndsAt) return;

    const revoked = await this.revokeFamily(rotated.familyId);
    // TODO(notifications): send the "suspicious sign-in" security alert once the pipeline exists.
    this.log.warn(
      { event: 'auth.refresh_reuse', userId: rotated.userId, sessionIds: revoked },
      'refresh token reused after rotation; session family revoked',
    );
  }

  async findActiveByRefreshToken(refreshToken: string) {
    return this.prisma.session.findFirst({
      where: { refreshTokenHash: sha256(refreshToken), revokedAt: null },
      select: { id: true },
    });
  }

  async revoke(sessionId: string) {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.markRevoked([sessionId]);
  }

  async revokeFamily(familyId: string): Promise<string[]> {
    const sessions = await this.prisma.session.findMany({
      where: { familyId, revokedAt: null },
      select: { id: true },
    });
    return this.revokeMany(sessions.map((session) => session.id));
  }

  async revokeAllForUser(userId: string, exceptSessionId?: string): Promise<string[]> {
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      select: { id: true },
    });
    return this.revokeMany(sessions.map((session) => session.id));
  }

  private async revokeMany(ids: string[]): Promise<string[]> {
    if (ids.length === 0) return ids;
    await this.prisma.session.updateMany({
      where: { id: { in: ids }, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.markRevoked(ids);
    return ids;
  }

  private async markRevoked(ids: string[]) {
    const pipeline = this.valkey.multi();
    for (const id of ids) {
      // Outlives any access token issued for the session, plus clock-skew margin.
      pipeline.set(revokedSessionKey(id), '1', 'EX', ACCESS_TOKEN_TTL_SEC + 60);
    }
    await pipeline.exec();
  }
}
