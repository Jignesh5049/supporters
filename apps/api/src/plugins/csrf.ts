import fp from 'fastify-plugin';
import { safeEqual } from '../lib/crypto';
import { AppError, ErrorCode } from '../lib/errors';
import { COOKIE, isHeaderMode } from '../modules/auth/auth.cookies';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

const csrfFailed = () => new AppError(403, ErrorCode.CsrfFailed, 'Request blocked');

/**
 * Pipeline step 5. Cookie-authenticated writes (the request carries
 * `__Host-at` or `__Host-rt`) need `Origin` equal to APP_ORIGIN and an
 * `x-csrf-token` header equal to the `__Host-csrf` cookie. Writes without auth
 * cookies (login, register) still reject a foreign `Origin`. Header-mode
 * (bearer or mobile) requests skip the check.
 */
export const csrfPlugin = fp(
  async (app) => {
    app.addHook('preParsing', async (request, _reply, payload) => {
      if (!UNSAFE_METHODS.has(request.method) || isHeaderMode(request)) return payload;

      const origin = request.headers.origin;
      if (origin !== undefined && origin !== app.env.APP_ORIGIN) throw csrfFailed();

      const { cookies } = request;
      if (cookies[COOKIE.access] !== undefined || cookies[COOKIE.refresh] !== undefined) {
        const header = request.headers['x-csrf-token'];
        const cookie = cookies[COOKIE.csrf];
        if (
          origin !== app.env.APP_ORIGIN ||
          typeof header !== 'string' ||
          cookie === undefined ||
          !safeEqual(header, cookie)
        ) {
          throw csrfFailed();
        }
      }
      return payload;
    });
  },
  { name: 'csrf', dependencies: ['env', 'auth'] },
);
