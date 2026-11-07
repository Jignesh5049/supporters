import { z } from 'zod';
import { ACCOUNT_LIMITS, ADMIN_LIMITS } from '../limits';
import { meSchema } from './auth';
import { paginationQuerySchema } from './common';

// The admin area (backend spec, Security: Admin; web spec, Admin area). Every
// `/v1/admin/*` route answers 404 to anyone without an admin session.

const personSchema = z.object({ id: z.uuid(), name: z.string() });

/** Password plus a 6-digit code from the authenticator app, at every sign-in. */
export const adminLoginSchema = z.strictObject({
  identifier: z.string().trim().min(1).max(ACCOUNT_LIMITS.emailMax),
  password: z.string().min(1).max(ACCOUNT_LIMITS.password.max),
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

/** Sets an 8-hour `__Host-at` cookie; there is no refresh token. */
export const adminSessionSchema = z.object({ user: meSchema, expiresAt: z.iso.datetime() });
export type AdminSession = z.infer<typeof adminSessionSchema>;

export const adminIdParamsSchema = z.strictObject({ id: z.uuid() });

// Users

export const adminUsersQuerySchema = paginationQuerySchema.extend({
  /** A name fragment, or a full +91 number. */
  q: z.string().trim().min(1).max(ADMIN_LIMITS.searchQueryMax).optional(),
  status: z.enum(['active', 'suspended', 'deleted']).optional(),
});
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;

export const adminUserSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  /** Masked to the last 4 digits. */
  phone: z.string(),
  role: z.enum(['user', 'admin']),
  status: z.enum(['active', 'suspended', 'deleted']),
  createdAt: z.iso.datetime(),
  business: z.object({ id: z.uuid(), name: z.string(), slug: z.string() }).nullable(),
  /** Open reports against their content. */
  openReportCount: z.number().int().min(0),
});
export type AdminUser = z.infer<typeof adminUserSchema>;

export const suspendUserSchema = z.strictObject({
  reason: z.string().trim().min(ADMIN_LIMITS.reason.min).max(ADMIN_LIMITS.reason.max),
});
export type SuspendUserInput = z.infer<typeof suspendUserSchema>;

/** The account after a suspend or restore; repeating either changes nothing. */
export const adminUserStateSchema = z.object({
  id: z.uuid(),
  status: z.enum(['active', 'suspended', 'deleted']),
});
export type AdminUserState = z.infer<typeof adminUserStateSchema>;

// Audit logs

export const auditLogsQuerySchema = paginationQuerySchema.extend({
  actorId: z.uuid().optional(),
  action: z.string().max(60).optional(),
  targetType: z.string().max(40).optional(),
  targetId: z.uuid().optional(),
});
export type AuditLogsQuery = z.infer<typeof auditLogsQuerySchema>;

export const auditLogSchema = z.object({
  id: z.uuid(),
  actor: personSchema,
  /** `resource.verb`, e.g. `verification.approve`. */
  action: z.string(),
  targetType: z.string().nullable(),
  targetId: z.uuid().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  ip: z.string().nullable(),
  createdAt: z.iso.datetime(),
});
export type AuditLog = z.infer<typeof auditLogSchema>;
