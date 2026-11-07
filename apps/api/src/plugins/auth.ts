import jwt from '@fastify/jwt';
import type { FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { z } from 'zod';
import { notFound, unauthenticated } from '../lib/errors';
import { COOKIE, isHeaderMode } from '../modules/auth/auth.cookies';
import { ACCESS_TOKEN_TTL_SEC, revokedSessionKey } from '../modules/auth/auth.constants';

const accessClaimsSchema = z.object({
  sub: z.uuid(),
  sid: z.uuid(),
  role: z.enum(['user', 'admin']),
  /** Set only on admin tokens issued after password plus TOTP. */
  mfa: z.literal(true).optional(),
  iat: z.number(),
  exp: z.number(),
});
export type AccessClaims = z.infer<typeof accessClaimsSchema>;

export interface AuthContext {
  userId: string;
  sessionId: string;
  role: AccessClaims['role'];
}

const BEARER = /^Bearer ([\w-]+\.[\w-]+\.[\w-]+)$/;
const claimsCache = Symbol('accessClaims');

function extractAccessToken(request: FastifyRequest): string | null {
  const header = request.headers.authorization;
  if (header !== undefined) return BEARER.exec(header)?.[1] ?? null;
  if (isHeaderMode(request)) return null;
  return request.cookies[COOKIE.access] ?? null;
}

/**
 * Pipeline step 4. The access token comes from `Authorization: Bearer`
 * (mobile) or the `__Host-at` cookie (web). Its EdDSA signature and expiry are
 * checked first (cheap, no I/O, and reused by the rate limiter's key), then
 * the session id is checked against the revoked set in Valkey. No database
 * read per request.
 */
export const authPlugin = fp(
  async (app) => {
    const { env } = app;
    await app.register(jwt, {
      secret: { private: env.JWT_PRIVATE_KEY.privatePem, public: env.JWT_PRIVATE_KEY.publicPem },
      sign: {
        algorithm: 'EdDSA', // @fastify/jwt reads a numeric expiresIn as seconds.
        expiresIn: ACCESS_TOKEN_TTL_SEC,
        kid: env.JWT_KEY_ID,
      },
      verify: { algorithms: ['EdDSA'] },
      decode: { complete: true },
    });

    function verifyAccessToken(token: string): AccessClaims | null {
      try {
        const decoded: unknown = app.jwt.decode(token);
        const kid = z.object({ header: z.object({ kid: z.string() }) }).safeParse(decoded).data
          ?.header.kid;
        let payload: unknown;
        if (kid === env.JWT_KEY_ID) {
          payload = app.jwt.verify(token);
        } else if (env.JWT_PREVIOUS_PUBLIC_KEY && kid === env.JWT_PREVIOUS_KEY_ID) {
          payload = app.jwt.verify(token, { key: env.JWT_PREVIOUS_PUBLIC_KEY });
        } else {
          return null;
        }
        return accessClaimsSchema.safeParse(payload).data ?? null;
      } catch {
        return null;
      }
    }

    app.decorate('accessTokens', {
      sign: (
        claims: { sub: string; sid: string; role: AccessClaims['role'] },
        options: { expiresInSec?: number; mfa?: boolean } = {},
      ) =>
        app.jwt.sign(
          options.mfa ? { ...claims, mfa: true } : claims,
          options.expiresInSec ? { expiresIn: options.expiresInSec } : {},
        ),
      verify: verifyAccessToken,
    });

    /**
     * The separate admin guard (backend spec, OWASP API5): an admin token that
     * passed TOTP, for a session still live in the database (8 h, not revoked)
     * of an account that is still an active admin. Checked against the database
     * on every admin request, so a revocation can't be outlived by Valkey.
     * Anyone else gets a 404, so the admin surface doesn't reveal itself.
     */
    async function requireAdmin(request: FastifyRequest) {
      const claims = request.accessClaims();
      if (!request.auth || request.auth.role !== 'admin' || claims?.mfa !== true) {
        throw notFound();
      }
      const session = await app.prisma.session.findFirst({
        where: {
          id: request.auth.sessionId,
          userId: request.auth.userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          user: { role: 'admin', status: 'active' },
        },
        select: { id: true },
      });
      if (!session) throw notFound();
    }

    app.decorateRequest('auth', null);
    app.decorateRequest('accessClaims', function (this: FastifyRequest) {
      const self = this as FastifyRequest & { [claimsCache]?: AccessClaims | null };
      if (self[claimsCache] === undefined) {
        const token = extractAccessToken(this);
        self[claimsCache] = token ? verifyAccessToken(token) : null;
      }
      return self[claimsCache];
    });

    app.addHook('preParsing', async (request, _reply, payload) => {
      const claims = request.accessClaims();
      if (claims && (await app.valkey.exists(revokedSessionKey(claims.sid))) === 0) {
        request.auth = { userId: claims.sub, sessionId: claims.sid, role: claims.role };
        request.log = request.log.child({ userId: claims.sub });
      }
      const required = request.routeOptions.config.auth;
      if (required === 'user' && !request.auth) throw unauthenticated();
      if (required === 'admin') await requireAdmin(request);
      return payload;
    });
  },
  { name: 'auth', dependencies: ['env', 'valkey', 'prisma'] },
);
