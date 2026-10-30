import type { Redis } from 'ioredis';
import type { Env } from '../config/env';
import type { PrismaClient } from '../generated/prisma/client';
import type { SlidingWindowLimiter } from '../lib/sliding-window';
import type { AccessClaims, AuthContext } from '../plugins/auth';

declare module 'fastify' {
  interface FastifyInstance {
    env: Env;
    prisma: PrismaClient;
    valkey: Redis;
    limiter: SlidingWindowLimiter;
    accessTokens: {
      sign(claims: Pick<AccessClaims, 'sub' | 'sid' | 'role'>): string;
      verify(token: string): AccessClaims | null;
    };
  }

  interface FastifyRequest {
    /** Set by the auth hook when a valid, unrevoked access token is present. */
    auth: AuthContext | null;
    /** Signature- and expiry-checked claims (no revocation check), memoized per request. */
    accessClaims(): AccessClaims | null;
  }

  interface FastifyContextConfig {
    /** `user`: reject guests with 401 before the body is parsed. */
    auth?: 'user';
  }
}
