import rateLimit from '@fastify/rate-limit';
import { RATE_LIMITS } from '@supporters/shared';
import type { FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { rateLimited } from '../lib/errors';
import { SlidingWindowLimiter } from '../lib/sliding-window';

type IncrCallback = (error: Error | null, result?: { current: number; ttl: number }) => void;

/** Adapts the Valkey sliding-window limiter to @fastify/rate-limit's store interface. */
function createStore(limiter: SlidingWindowLimiter) {
  return class SlidingWindowStore {
    incr(key: string, callback: IncrCallback, timeWindowMs: number, max: number) {
      limiter.hit(key, max, Math.ceil(timeWindowMs / 1000)).then(
        (result) =>
          callback(null, {
            // The plugin treats `current > max` as exceeded.
            current: result.allowed ? Math.min(result.count, max) : max + 1,
            ttl: result.resetMs,
          }),
        (error: unknown) => callback(error instanceof Error ? error : new Error(String(error))),
      );
    }

    child() {
      return new SlidingWindowStore();
    }
  };
}

const isSignedIn = (request: FastifyRequest) => request.accessClaims() !== null;

/**
 * Pipeline step 3: a global limit keyed by user id when signed in and by IP
 * otherwise. Route-specific auth limits (login, OTP) live in the auth service.
 */
export const rateLimitPlugin = fp(
  async (app) => {
    await app.register(rateLimit, {
      global: true,
      store: createStore(app.limiter),
      timeWindow: RATE_LIMITS.guestRequests.windowSec * 1000,
      max: (request) =>
        isSignedIn(request) ? RATE_LIMITS.userRequests.max : RATE_LIMITS.guestRequests.max,
      keyGenerator: (request) => {
        const claims = request.accessClaims();
        return claims ? `api:user:${claims.sub}` : `api:ip:${request.ip}`;
      },
      errorResponseBuilder: (_request, context) => rateLimited(Math.ceil(context.ttl / 1000)),
      addHeaders: {
        'x-ratelimit-limit': true,
        'x-ratelimit-remaining': true,
        'x-ratelimit-reset': true,
        'retry-after': false,
      },
    });
  },
  { name: 'rate-limit', dependencies: ['valkey', 'auth'] },
);
