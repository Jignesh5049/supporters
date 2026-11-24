import {
  ADMIN_LIMITS,
  adminCategoriesSchema,
  adminCategorySchema,
  adminIdParamsSchema,
  adminLoginSchema,
  adminReportSchema,
  adminReportsQuerySchema,
  adminSessionSchema,
  adminUserSchema,
  adminUsersQuerySchema,
  adminVerificationSchema,
  adminVerificationsQuerySchema,
  auditLogSchema,
  auditLogsQuerySchema,
  createCategorySchema,
  documentLinkSchema,
  pageSchema,
  rejectVerificationSchema,
  reportActionInputSchema,
  reportActionResultSchema,
  suspendUserSchema,
  updateCategorySchema,
  verificationDocumentParamsSchema,
} from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { COOKIE, clearSessionCookies, setAdminSessionCookies } from '../auth/auth.cookies';
import { adminPaymentsRoutes } from '../payments/payments.routes';
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

  // Verifications
  app.get(
    '/verifications',
    {
      schema: {
        querystring: adminVerificationsQuerySchema,
        response: { 200: pageSchema(adminVerificationSchema) },
      },
    },
    async (request) => admin.verifications.list(request.query),
  );

  app.get(
    '/verifications/:id/documents/:documentId',
    { schema: { params: verificationDocumentParamsSchema, response: { 200: documentLinkSchema } } },
    async (request) =>
      admin.verifications.documentLink(
        adminActor(request),
        request.params.id,
        request.params.documentId,
      ),
  );

  app.post(
    '/verifications/:id/approve',
    { schema: { params: adminIdParamsSchema, response: { 200: adminVerificationSchema } } },
    async (request) => admin.verifications.approve(adminActor(request), request.params.id),
  );

  app.post(
    '/verifications/:id/reject',
    {
      schema: {
        params: adminIdParamsSchema,
        body: rejectVerificationSchema,
        response: { 200: adminVerificationSchema },
      },
    },
    async (request) =>
      admin.verifications.reject(adminActor(request), request.params.id, request.body),
  );

  // Reports
  app.get(
    '/reports',
    {
      schema: {
        querystring: adminReportsQuerySchema,
        response: { 200: pageSchema(adminReportSchema) },
      },
    },
    async (request) => admin.reports.list(request.query),
  );

  app.post(
    '/reports/:id/action',
    {
      schema: {
        params: adminIdParamsSchema,
        body: reportActionInputSchema,
        response: { 200: reportActionResultSchema },
      },
    },
    async (request) => admin.reports.act(adminActor(request), request.params.id, request.body),
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

  // Categories
  app.get('/categories', { schema: { response: { 200: adminCategoriesSchema } } }, async () => ({
    data: await admin.categories.list(),
  }));

  app.post(
    '/categories',
    { schema: { body: createCategorySchema, response: { 201: adminCategorySchema } } },
    async (request, reply) =>
      reply.status(201).send(await admin.categories.create(adminActor(request), request.body)),
  );

  app.patch(
    '/categories/:id',
    {
      schema: {
        params: adminIdParamsSchema,
        body: updateCategorySchema,
        response: { 200: adminCategorySchema },
      },
    },
    async (request) =>
      admin.categories.update(adminActor(request), request.params.id, request.body),
  );

  app.delete(
    '/categories/:id',
    { schema: { params: adminIdParamsSchema, response: { 204: z.null() } } },
    async (request, reply) => {
      await admin.categories.remove(adminActor(request), request.params.id);
      return reply.status(204).send(null);
    },
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

  // Payments and refunds (inherits the admin guard, audit and no-store hooks above).
  await app.register(adminPaymentsRoutes);
};
