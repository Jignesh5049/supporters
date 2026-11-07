import { z } from 'zod';
import { ACCOUNT_LIMITS, ADMIN_LIMITS, REPORT_LIMITS, VERIFICATION_LIMITS } from '../limits';
import { meSchema } from './auth';
import { VerificationStatus } from './business';
import { paginationQuerySchema, slugPattern } from './common';
import {
  reportActionSchema,
  reportReasonSchema,
  reportStatusSchema,
  reportTargetTypeSchema,
} from './reports';
import {
  verificationDocumentKindSchema,
  verificationMethodSchema,
  verificationRequestStatusSchema,
} from './verification';

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

// Verifications

export const adminVerificationsQuerySchema = paginationQuerySchema.extend({
  status: verificationRequestStatusSchema.default('pending'),
});
export type AdminVerificationsQuery = z.infer<typeof adminVerificationsQuerySchema>;

export const adminVerificationSchema = z.object({
  id: z.uuid(),
  method: verificationMethodSchema,
  registrationNumber: z.string(),
  status: verificationRequestStatusSchema,
  rejectionReason: z.string().nullable(),
  submittedAt: z.iso.datetime(),
  reviewedAt: z.iso.datetime().nullable(),
  reviewer: personSchema.nullable(),
  business: z.object({
    id: z.uuid(),
    name: z.string(),
    slug: z.string(),
    /** The GSTIN on the profile, to compare with the submitted number. */
    gstin: z.string().nullable(),
    city: z.string(),
    verificationStatus: z.enum(Object.values(VerificationStatus)),
  }),
  owner: personSchema,
  /** Open one with `GET .../documents/:documentId`, which returns a 5-minute link. */
  documents: z.array(
    z.object({
      id: z.uuid(),
      kind: verificationDocumentKindSchema,
      contentType: z.string(),
      size: z.number().int(),
    }),
  ),
});
export type AdminVerification = z.infer<typeof adminVerificationSchema>;

export const verificationDocumentParamsSchema = z.strictObject({
  id: z.uuid(),
  documentId: z.uuid(),
});

/** A presigned GET link, valid for 5 minutes. Open it in a new tab; never embed or cache it. */
export const documentLinkSchema = z.object({ url: z.url(), expiresAt: z.iso.datetime() });
export type DocumentLink = z.infer<typeof documentLinkSchema>;

export const rejectVerificationSchema = z.strictObject({
  reason: z
    .string()
    .trim()
    .min(VERIFICATION_LIMITS.rejectionReason.min)
    .max(VERIFICATION_LIMITS.rejectionReason.max),
});
export type RejectVerificationInput = z.infer<typeof rejectVerificationSchema>;

// Reports

export const adminReportsQuerySchema = paginationQuerySchema.extend({
  status: reportStatusSchema.default('open'),
  targetType: reportTargetTypeSchema.optional(),
});
export type AdminReportsQuery = z.infer<typeof adminReportsQuerySchema>;

export const adminReportSchema = z.object({
  id: z.uuid(),
  targetType: reportTargetTypeSchema,
  targetId: z.uuid(),
  reason: reportReasonSchema,
  details: z.string().nullable(),
  status: reportStatusSchema,
  action: reportActionSchema.nullable(),
  resolutionNote: z.string().nullable(),
  createdAt: z.iso.datetime(),
  resolvedAt: z.iso.datetime().nullable(),
  reporter: personSchema,
  /** The author or owner of the target. */
  subject: personSchema.extend({ status: z.enum(['active', 'suspended', 'deleted']) }),
  target: z.object({
    /** The start of the reported text, or the business name. */
    excerpt: z.string().nullable(),
    isHidden: z.boolean(),
    /** Deleted by its author since it was reported. */
    isDeleted: z.boolean(),
    /** For a link to the public page: the post (of a post or comment) and the business. */
    postId: z.uuid().nullable(),
    businessSlug: z.string().nullable(),
  }),
  /** Open reports on the same target, from different people. */
  openReportCount: z.number().int().min(0),
});
export type AdminReport = z.infer<typeof adminReportSchema>;

export const reportActionInputSchema = z.strictObject({
  action: reportActionSchema,
  note: z.string().trim().max(REPORT_LIMITS.note.max).optional(),
});
export type ReportActionInput = z.infer<typeof reportActionInputSchema>;

export const reportActionResultSchema = z.object({
  /** Open reports on the target that this closed, including the one acted on. */
  resolvedCount: z.number().int().min(0),
  isTargetHidden: z.boolean(),
  subjectStatus: z.enum(['active', 'suspended', 'deleted']),
});
export type ReportActionResult = z.infer<typeof reportActionResultSchema>;

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

// Categories

const categoryNameSchema = z
  .string()
  .trim()
  .min(ADMIN_LIMITS.categoryName.min)
  .max(ADMIN_LIMITS.categoryName.max);
const categorySlugSchema = z
  .string()
  .min(ADMIN_LIMITS.categoryName.min)
  .max(ADMIN_LIMITS.categoryName.max)
  .regex(slugPattern, 'Use lower-case words joined by hyphens');
const positionSchema = z.number().int().min(0).max(ADMIN_LIMITS.categoryPositionMax);

export const adminCategorySchema = z.object({
  id: z.uuid(),
  parentId: z.uuid().nullable(),
  name: z.string(),
  slug: z.string(),
  position: z.number().int(),
  isActive: z.boolean(),
  /** What still points at it; a category in use can be deactivated but not deleted. */
  usage: z.object({
    subcategories: z.number().int(),
    businesses: z.number().int(),
    listings: z.number().int(),
  }),
});
export type AdminCategory = z.infer<typeof adminCategorySchema>;

export const adminCategoriesSchema = z.object({ data: z.array(adminCategorySchema) });

/** A top-level category, or a subcategory when `parentId` names one. */
export const createCategorySchema = z.strictObject({
  name: categoryNameSchema,
  slug: categorySlugSchema,
  parentId: z.uuid().nullable().default(null),
  position: positionSchema.default(0),
  isActive: z.boolean().default(true),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

/** The parent never changes; create a new category and deactivate the old one instead. */
export const updateCategorySchema = z
  .strictObject({
    name: categoryNameSchema,
    slug: categorySlugSchema,
    position: positionSchema,
    isActive: z.boolean(),
  })
  .partial()
  .refine((input) => Object.keys(input).length > 0, { message: 'Change at least one field' });
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

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
