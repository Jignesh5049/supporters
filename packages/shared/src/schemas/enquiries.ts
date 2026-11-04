import { z } from 'zod';
import { LISTING_LIMITS, TEXT_LIMITS } from '../limits';
import { businessSummarySchema } from './business';
import { enquiryStatusSchema, listingCardSchema } from './chat';
import { paginationQuerySchema } from './common';
import { productUnitSchema } from './listings';
import { citySchema } from './places';
import { userRefSchema } from './social';

/** Contact Supplier form (product spec, Messaging: Enquiries). The business comes from the listing. */
export const createEnquirySchema = z
  .strictObject({
    productId: z.uuid().optional(),
    serviceId: z.uuid().optional(),
    quantity: z.number().int().min(1).max(LISTING_LIMITS.maxMoq).optional(),
    unit: productUnitSchema.optional(),
    deliveryCityId: z.uuid().optional(),
    message: z
      .string()
      .trim()
      .min(TEXT_LIMITS.enquiryMessage.min)
      .max(TEXT_LIMITS.enquiryMessage.max),
    /** Share the verified phone number of the buyer with this business. */
    sharePhone: z.boolean().default(false),
  })
  .superRefine((input, ctx) => {
    if ((input.productId === undefined) === (input.serviceId === undefined)) {
      ctx.addIssue({
        code: 'custom',
        path: ['productId'],
        message: 'Name one product or one service',
      });
    }
  });
export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;

export const enquirySchema = z.object({
  id: z.uuid(),
  status: enquiryStatusSchema,
  conversationId: z.uuid(),
  messageId: z.uuid(),
  buyer: userRefSchema,
  business: businessSummarySchema,
  /** Null once the listing is no longer public. */
  listing: listingCardSchema.nullable(),
  quantity: z.number().int().nullable(),
  unit: z.string().nullable(),
  deliveryCity: citySchema.nullable(),
  message: z.string(),
  sharePhone: z.boolean(),
  /** Only the business sees it, and only when the buyer chose to share it. */
  buyerPhone: z.string().nullable(),
  firstResponseAt: z.iso.datetime().nullable(),
  closedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type Enquiry = z.infer<typeof enquirySchema>;

export const enquiryIdParamsSchema = z.strictObject({ id: z.uuid() });

/** The inbox of the owner: filter by status, date range and listing. */
export const businessEnquiriesQuerySchema = paginationQuerySchema.extend({
  status: enquiryStatusSchema.optional(),
  from: z.iso.datetime({ offset: true }).optional(),
  to: z.iso.datetime({ offset: true }).optional(),
  productId: z.uuid().optional(),
  serviceId: z.uuid().optional(),
});
export type BusinessEnquiriesQuery = z.infer<typeof businessEnquiriesQuerySchema>;

/** The owner closes by hand; Responded is automatic. */
export const updateEnquirySchema = z.strictObject({ status: z.literal('closed') });
export type UpdateEnquiryInput = z.infer<typeof updateEnquirySchema>;

/**
 * Response rate: the share of enquiries from the last 90 days answered within
 * 24 hours. Response time: the median minutes to the first reply. Both are
 * null until the business has 5 enquiries in the window.
 */
export const responseStatsSchema = z.object({
  enquiryCount: z.number().int(),
  responseRate: z.number().min(0).max(1).nullable(),
  medianResponseMinutes: z.number().nullable(),
});
export type ResponseStats = z.infer<typeof responseStatsSchema>;
