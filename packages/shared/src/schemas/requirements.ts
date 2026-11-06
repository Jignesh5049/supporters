import { z } from 'zod';
import { TEXT_LIMITS, MEDIA_LIMITS, REQUIREMENT } from '../limits';
import { productUnitSchema } from './listings';

export const requirementStatusSchema = z.enum(['open', 'closed', 'fulfilled', 'expired']);
export type RequirementStatus = z.infer<typeof requirementStatusSchema>;

export const requirementUrgencySchema = z.enum(['immediate', 'standard', 'flexible']);
export type RequirementUrgency = z.infer<typeof requirementUrgencySchema>;

export const createRequirementSchema = z.strictObject({
  title: z.string().trim().min(5).max(120),
  description: z
    .string()
    .trim()
    .min(TEXT_LIMITS.requirement.min)
    .max(TEXT_LIMITS.requirement.max),
  categoryId: z.string().min(1),
  quantity: z.number().int().min(1),
  unit: productUnitSchema,
  deliveryCity: z.string().trim().min(2).max(100),
  deliveryState: z.string().trim().min(2).max(100).optional(),
  targetBudgetPaise: z.number().int().min(100).optional(),
  images: z.array(z.string().url()).max(MEDIA_LIMITS.imagesPerRequirement.max).default([]),
  urgency: requirementUrgencySchema.default('standard'),
});
export type CreateRequirementInput = z.infer<typeof createRequirementSchema>;

export const buyerRequirementSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  categoryId: z.string(),
  categoryName: z.string().optional(),
  quantity: z.number(),
  unit: z.string(),
  deliveryCity: z.string(),
  deliveryState: z.string().optional(),
  targetBudgetPaise: z.number().nullable().optional(),
  images: z.array(z.string()).default([]),
  urgency: requirementUrgencySchema.default('standard'),
  status: requirementStatusSchema.default('open'),
  quotesCount: z.number().default(0),
  createdAt: z.string(),
  expiresAt: z.string(),
  buyerId: z.string(),
  buyerName: z.string(),
  isMatched: z.boolean().optional(),
});
export type BuyerRequirement = z.infer<typeof buyerRequirementSchema>;

export const createQuoteSchema = z.strictObject({
  pricePaise: z.number().int().min(1),
  leadTimeDays: z.number().int().min(1).max(365),
  message: z.string().trim().min(10).max(1000),
});
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
