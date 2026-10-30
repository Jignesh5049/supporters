import type { CookieSerializeOptions } from '@fastify/cookie';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { randomToken } from '../../lib/crypto';
import { ACCESS_TOKEN_TTL_SEC } from './auth.constants';

/** `__Host-` cookies must be Secure, Path=/ and have no Domain (backend spec, Web cookies). */
export const COOKIE = {
  access: '__Host-at',
  refresh: '__Host-rt',
  csrf: '__Host-csrf',
} as const;

const base: CookieSerializeOptions = { secure: true, sameSite: 'lax', path: '/' };

/**
 * Header mode: mobile clients and anything sending `Authorization`. Auth
 * cookies are ignored and CSRF does not apply, since a cross-site page cannot
 * set these headers without a CORS preflight.
 */
export const isHeaderMode = (request: FastifyRequest): boolean =>
  request.headers.authorization !== undefined || request.headers['x-client'] === 'mobile';

export function setSessionCookies(
  reply: FastifyReply,
  tokens: { accessToken: string; refreshToken: string; refreshMaxAgeSec: number },
  options: { rotateCsrf: boolean; currentCsrf?: string | undefined },
) {
  reply.setCookie(COOKIE.access, tokens.accessToken, {
    ...base,
    httpOnly: true,
    maxAge: ACCESS_TOKEN_TTL_SEC,
  });
  reply.setCookie(COOKIE.refresh, tokens.refreshToken, {
    ...base,
    httpOnly: true,
    maxAge: tokens.refreshMaxAgeSec,
  });
  const csrf = options.rotateCsrf || !options.currentCsrf ? randomToken() : options.currentCsrf;
  // Readable by scripts so the web app can echo it in `x-csrf-token`.
  reply.setCookie(COOKIE.csrf, csrf, { ...base, httpOnly: false, maxAge: tokens.refreshMaxAgeSec });
}

export function setCsrfCookie(reply: FastifyReply, token: string, maxAgeSec: number) {
  reply.setCookie(COOKIE.csrf, token, { ...base, httpOnly: false, maxAge: maxAgeSec });
}

export function clearSessionCookies(reply: FastifyReply) {
  for (const name of Object.values(COOKIE)) {
    reply.clearCookie(name, { ...base, httpOnly: name !== COOKIE.csrf });
  }
}
