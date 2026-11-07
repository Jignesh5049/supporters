import {
  ADMIN_LIMITS,
  adminIdParamsSchema,
  adminLoginSchema,
  adminSessionSchema,
  adminUserSchema,
  adminUsersQuerySchema,
  auditLogSchema,
  auditLogsQuerySchema,
  pageSchema,
  suspendUserSchema,
} from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { COOKIE, clearSessionCookies, setAdminSessionCookies } from '../auth/auth.cookies';
import { adminActor, writeAudit } from './audit.service';

/** Every admin route, as `METHOD /url`, for the authorization test matrix. */
export const ADMIN_ROUTES = new Set<string>();

const userStateSchema = z.object({
  id: z.uuid(),
  status: z.enum(['active', 'suspended', 'deleted']),
});

/**
 * `/v1/admin/*` (backend spec, Endpoint map: Admin). Every route except sign-in
 * is forced to `auth: 'admin'`: an admin session that passed TOTP, still live
 * in the database, for an active admin; anyone else gets a 404. Responses are
 * never cached or indexed, and reads are audit-logged like writes.
 */
export const adminRoutes: FastifyPluginAsyncZod = async (app) => {
  const { admin } = app.services;

  app.addHook('onRoute', (route) => {
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    for (const method of methods) {
      if (method !== 'HEAD') ADMIN_ROUTES.add(`${method} ${route.url}`);
    }
    if (route.config?.isAdminSignIn) return;
    route.config = { ...route.config, auth: 'admin' };
  });

  app.addHook('onSend', async (request, reply, payload) => {
    reply.header('cache-control', 'no-store');
    reply.header('x-robots-tag', 'noindex, nofollow');
    // A read by an admin is recorded too (writes record themselves, in their transaction).
    if (request.method === 'GET' && request.routeOptions.config.auth === 'admin' && request.auth) {
      await writeAudit(app.prisma, adminActor(request), {
        action: 'admin.read',
        metadata: {
          route: request.routeOptions.url ?? '',
          params: request.params ?? {},
          query: request.query ?? {},
          status: reply.statusCode,
        },
      });
    }
    return payload;
  });

  // Sign-in: password plus TOTP, at every login. No refresh token is issued.
  app.post(
    '/auth/login',
    {
      config: { isAdminSignIn: true },
      schema: { body: adminLoginSchema, response: { 200: adminSessionSchema } },
    },
    async (request, reply) => {
      const result = await app.services.auth.loginAdmin(request.body, {
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });
      const accessToken = app.accessTokens.sign(
        { sub: result.user.id, sid: result.session.sessionId, role: 'admin' },
        { expiresInSec: ADMIN_LIMITS.sessionTtlSec, mfa: true },
      );
      // Drop any user session cookie of this browser: a refresh must never swap the admin out.
      if (request.cookies[COOKIE.refresh]) clearSessionCookies(reply);
      setAdminSessionCookies(reply, accessToken, ADMIN_LIMITS.sessionTtlSec);
      return reply.send({ user: result.user, expiresAt: result.session.expiresAt.toISOString() });
    },
  );

  // Users
  app.get(
    '/users',
    {
      schema: {
        querystring: adminUsersQuerySchema,
        response: { 200: pageSchema(adminUserSchema) },
      },
    },
    async (request) => admin.users.list(request.query),
  );

  app.post(
    '/users/:id/suspend',
    {
      schema: {
        params: adminIdParamsSchema,
        body: suspendUserSchema,
        response: { 200: userStateSchema },
      },
    },
    async (request) => admin.users.suspend(adminActor(request), request.params.id, request.body),
  );

  app.post(
    '/users/:id/restore',
    { schema: { params: adminIdParamsSchema, response: { 200: userStateSchema } } },
    async (request) => admin.users.restore(adminActor(request), request.params.id),
  );

  // Audit logs
  app.get(
    '/audit-logs',
    {
      schema: {
        querystring: auditLogsQuerySchema,
        response: { 200: pageSchema(auditLogSchema) },
      },
    },
    async (request) => admin.auditLogs.list(request.query),
  );
};
