import { z } from 'zod';
import { LISTING_LIMITS, MEDIA_LIMITS, TEXT_LIMITS } from '../limits';
import { categoryRefSchema } from './categories';
import { moneyInputSchema, moneySchema, paginationQuerySchema } from './common';
import { productUnitSchema } from './listings';
import { citySchema } from './places';
import { mediaSchema } from './uploads';

// Buyer requirements (product spec, Discovery and buyer requirements: reverse discovery).

export const RequirementStatus = {
  Open: 'open',
  Closed: 'closed',
  Fulfilled: 'fulfilled',
  Expired: 'expired',
} as const;
export type RequirementStatus = (typeof RequirementStatus)[keyof typeof RequirementStatus];
export const requirementStatusSchema = z.enum(Object.values(RequirementStatus));

/** The post form. The buyer comes from the session; matching businesses are found afterwards. */
export const createRequirementSchema = z.strictObject({
  description: z.string().trim().min(TEXT_LIMITS.requirement.min).max(TEXT_LIMITS.requirement.max),
  /** A top-level category or a subcategory; matching uses its top-level category. */
  categoryId: z.uuid(),
  quantity: z.number().int().min(1).max(LISTING_LIMITS.maxMoq),
  unit: productUnitSchema,
  deliveryCityId: z.uuid(),
  budget: moneyInputSchema.optional(),
  /** Ready uploads with purpose `requirement`. */
  imageIds: z
    .array(z.uuid())
    .max(MEDIA_LIMITS.imagesPerRequirement.max)
    .refine((ids) => new Set(ids).size === ids.length, { message: 'Each image may appear once' })
    .default([]),
});
export type CreateRequirementInput = z.input<typeof createRequirementSchema>;

/** The buyer closes early or marks it fulfilled; only an open requirement can change. */
export const updateRequirementSchema = z.strictObject({
  status: z.enum([RequirementStatus.Closed, RequirementStatus.Fulfilled]),
});
export type UpdateRequirementInput = z.infer<typeof updateRequirementSchema>;

export const requirementIdParamsSchema = z.strictObject({ id: z.uuid() });

/** The buyer as businesses see them: name and city only, never phone or email. */
export const requirementBuyerSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  city: citySchema.nullable(),
});
export type RequirementBuyer = z.infer<typeof requirementBuyerSchema>;

export const requirementSchema = z.object({
  id: z.uuid(),
  status: requirementStatusSchema,
  description: z.string(),
  category: categoryRefSchema,
  quantity: z.number().int(),
  unit: productUnitSchema,
  deliveryCity: citySchema,
  budget: moneySchema.nullable(),
  images: z.array(mediaSchema),
  buyer: requirementBuyerSchema,
  quoteCount: z.number().int().min(0),
  /** The viewer's business has quoted on it. Always false for the buyer. */
  hasQuoted: z.boolean(),
  /** The viewer posted it. */
  isMine: z.boolean(),
  expiresAt: z.iso.datetime(),
  closedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type Requirement = z.infer<typeof requirementSchema>;

/** The buyer's own list: everything they posted, or one status. */
export const myRequirementsQuerySchema = paginationQuerySchema.extend({
  status: requirementStatusSchema.optional(),
});
export type MyRequirementsQuery = z.infer<typeof myRequirementsQuerySchema>;
