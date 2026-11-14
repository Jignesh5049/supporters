import {
  OTP,
  RATE_LIMITS,
  authResponseSchema,
  loginSchema,
  logoutSchema,
  mobileTokensSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  sendOtpSchema,
} from '@supporters/shared';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { randomToken } from '../../lib/crypto';
import { signupSignals } from '../referrals/referrals.signals';
import { AppError, ErrorCode } from '../../lib/errors';
import {
  COOKIE,
  clearSessionCookies,
  isHeaderMode,
  setCsrfCookie,
  setSessionCookies,
} from './auth.cookies';
import { ACCESS_TOKEN_TTL_SEC, REFRESH_TOKEN_TTL_SEC } from './auth.constants';
import type { SignedIn } from './auth.service';
import type { ClientMeta, IssuedSession } from './session.service';

/** Mobile clients get tokens in the body; web gets cookies (backend spec, Mobile tokens). */
const isMobileClient = (request: FastifyRequest) => request.headers['x-client'] === 'mobile';

const clientMeta = (request: FastifyRequest): ClientMeta => ({
  ip: request.ip,
  userAgent: request.headers['user-agent'],
});

function issueTokens(app: FastifyInstance, session: IssuedSession) {
  return {
    accessToken: app.accessTokens.sign({
      sub: session.userId,
      sid: session.sessionId,
      role: session.role,
    }),
    refreshToken: session.refreshToken,
    refreshMaxAgeSec: Math.max(
      0,
      Math.floor((session.refreshExpiresAt.getTime() - Date.now()) / 1000),
    ),
  };
}

function sendSignedIn(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
  result: SignedIn,
) {
  const tokens = issueTokens(app, result.session);
  if (isMobileClient(request)) {
    return {
      user: result.user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SEC,
    };
  }
  setSessionCookies(reply, tokens, { rotateCsrf: true });
  return { user: result.user };
}

const otpSentSchema = z.object({ expiresIn: z.number(), resendAfter: z.number() });

export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  const { auth, sessions } = app.services;

  app.post(
    '/auth/otp/send',
    { schema: { body: sendOtpSchema, response: { 202: otpSentSchema } } },
    async (request, reply) => {
      await auth.sendOtp(request.body, clientMeta(request));
      return reply
        .status(202)
        .send({ expiresIn: OTP.ttlSec, resendAfter: RATE_LIMITS.otpSendCooldownSec });
    },
  );

  app.post(
    '/auth/register',
    { schema: { body: registerSchema, response: { 201: authResponseSchema } } },
    async (request, reply) => {
      const result = await auth.register(request.body, clientMeta(request), signupSignals(request));
      return reply.status(201).send(sendSignedIn(app, request, reply, result));
    },
  );

  app.post(
    '/auth/login',
    { schema: { body: loginSchema, response: { 200: authResponseSchema } } },
    async (request, reply) => {
      const result = await auth.login(request.body, clientMeta(request));
      return reply.send(sendSignedIn(app, request, reply, result));
    },
  );

  app.post(
    '/auth/refresh',
    {
      schema: {
        body: refreshSchema.nullish(),
        response: { 200: mobileTokensSchema, 204: z.null() },
      },
    },
    async (request, reply) => {
      const mobile = isMobileClient(request);
      const presented = mobile ? request.body?.refreshToken : request.cookies[COOKIE.refresh];
      try {
        if (!presented) {
          throw new AppError(401, ErrorCode.InvalidRefreshToken, 'Session expired, sign in again');
        }
        const session = await sessions.rotate(presented, clientMeta(request));
        const tokens = issueTokens(app, session);
        if (mobile) {
          return await reply.send({
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
            expiresIn: ACCESS_TOKEN_TTL_SEC,
          });
        }
        setSessionCookies(reply, tokens, {
          rotateCsrf: false,
          currentCsrf: request.cookies[COOKIE.csrf],
        });
        return await reply.status(204).send(null);
      } catch (error) {
        if (!mobile) clearSessionCookies(reply);
        throw error;
      }
    },
  );

  app.post(
    '/auth/logout',
    { schema: { body: logoutSchema.nullish(), response: { 204: z.null() } } },
    async (request, reply) => {
      const headerMode = isHeaderMode(request);
      let sessionId = request.auth?.sessionId;
      if (!sessionId) {
        const refreshToken = headerMode
          ? request.body?.refreshToken
          : request.cookies[COOKIE.refresh];
        if (refreshToken) sessionId = (await sessions.findActiveByRefreshToken(refreshToken))?.id;
      }
      if (sessionId) await sessions.revoke(sessionId);
      if (!headerMode) clearSessionCookies(reply);
      return reply.status(204).send(null);
    },
  );

  app.post(
    '/auth/password/reset',
    { schema: { body: resetPasswordSchema, response: { 204: z.null() } } },
    async (request, reply) => {
      await auth.resetPassword(request.body);
      if (!isHeaderMode(request)) clearSessionCookies(reply);
      return reply.status(204).send(null);
    },
  );

  /** Issues the CSRF cookie for a web session that lost it. */
  app.get(
    '/auth/csrf',
    { schema: { response: { 200: z.object({ csrfToken: z.string() }) } } },
    async (request, reply) => {
      const csrfToken = request.cookies[COOKIE.csrf] ?? randomToken();
      setCsrfCookie(reply, csrfToken, REFRESH_TOKEN_TTL_SEC);
      return reply.send({ csrfToken });
    },
  );
};
