import { z } from 'zod';
import { PLAN_LIMITS, PREMIUM } from '../limits';
import { gstinSchema } from './business';
import { moneySchema, paginationQuerySchema } from './common';

// Supporters Premium (product spec, Monetization: Premium subscription; backend spec, Payments and
// money). Money is integer paise, always INR. Premium is bought on the web only.

/** What the owner sees. `grace` is Premium kept alive after a failed renewal payment. */
export const PremiumState = {
  /** Never bought. */
  None: 'none',
  /** Checkout started, not paid (the webhook has not confirmed it). */
  Pending: 'pending',
  Active: 'active',
  /** The renewal failed; perks continue until `graceEndsAt`. */
  Grace: 'grace',
  /** Was Premium; perks are off. Nothing is deleted. */
  Expired: 'expired',
} as const;
export type PremiumState = (typeof PremiumState)[keyof typeof PremiumState];
export const premiumStateSchema = z.enum(PremiumState);

/** Perks of the plan (product spec, decision 6, proposed). */
export const PremiumPerk = {
  Badge: 'badge',
  Featured: 'featured',
  SearchBoost: 'search_boost',
  UnlimitedListings: 'unlimited_listings',
  UnlimitedPosts: 'unlimited_posts',
  AnalyticsHistory: 'analytics_history',
  RequirementPriority: 'requirement_priority',
} as const;
export type PremiumPerk = (typeof PremiumPerk)[keyof typeof PremiumPerk];
export const premiumPerkSchema = z.enum(PremiumPerk);
export const PREMIUM_PERKS: readonly PremiumPerk[] = Object.values(PremiumPerk);

export const premiumStatusSchema = z.object({
  state: premiumStateSchema,
  /** Perks are on right now (also during grace). */
  isPremium: z.boolean(),
  /** False once the owner cancelled: Premium ends at `expiresAt`. */
  autoRenew: z.boolean(),
  /** When perks end (`premium_until`), including any grace. */
  expiresAt: z.iso.datetime().nullable(),
  /** The next renewal charge, while auto-renew is on. */
  renewsAt: z.iso.datetime().nullable(),
  graceEndsAt: z.iso.datetime().nullable(),
  /** The first purchase can be refunded in full until then (admin-initiated). */
  refundableUntil: z.iso.datetime().nullable(),
  price: moneySchema,
  perks: z.array(premiumPerkSchema),
  /** Limits of the free plan, for the expired state. `null` is unlimited. */
  limits: z.object({
    publishedListings: z.number().int().nullable(),
    postsPer7Days: z.number().int().nullable(),
  }),
  /** Listings unpublished when Premium ended that the owner has not decided on. */
  heldListingCount: z.number().int().min(0),
});
export type PremiumStatus = z.infer<typeof premiumStatusSchema>;

/** Web only: the app refuses it with `X-Client: mobile`. Needs an `Idempotency-Key` header (UUID). */
export const premiumCheckoutSchema = z.strictObject({
  /** Printed on the invoice as the buyer GSTIN; defaults to the business GSTIN. */
  buyerGstin: gstinSchema.optional(),
});
export type PremiumCheckoutInput = z.infer<typeof premiumCheckoutSchema>;

/** What Razorpay Checkout needs. The key id is public by design; the key secret never leaves the server. */
export const premiumCheckoutResultSchema = z.object({
  subscriptionId: z.uuid(),
  provider: z.enum(['razorpay', 'fake']),
  checkout: z.object({
    keyId: z.string(),
    /** Razorpay's `sub_...` id, passed to Checkout as `subscription_id`. */
    providerSubscriptionId: z.string(),
  }),
  price: moneySchema,
});
export type PremiumCheckoutResult = z.infer<typeof premiumCheckoutResultSchema>;

// Invoices

export const invoiceSchema = z.object({
  id: z.uuid(),
  /** `SUP/2026-27/000123`. */
  number: z.string(),
  issuedAt: z.iso.datetime(),
  total: moneySchema,
  taxable: moneySchema,
  tax: moneySchema,
  /** The worker has not finished the PDF yet while this is false. */
  isPdfReady: z.boolean(),
});
export type Invoice = z.infer<typeof invoiceSchema>;

export const invoiceDetailSchema = invoiceSchema.extend({
  /** A short-lived signed link (5 minutes), or null until the PDF is ready. */
  downloadUrl: z.url().nullable(),
  taxBreakup: z.object({
    ratePercent: z.number(),
    cgst: moneySchema,
    sgst: moneySchema,
    igst: moneySchema,
  }),
  buyerGstin: z.string().nullable(),
});
export type InvoiceDetail = z.infer<typeof invoiceDetailSchema>;

export const invoicesPageSchema = z.object({
  data: z.array(invoiceSchema),
  nextCursor: z.string().nullable(),
});

export const invoiceIdParamsSchema = z.strictObject({ id: z.uuid() });

// Choosing which listings to keep after Premium ends

export const premiumListingKindSchema = z.enum(['product', 'service']);
export const premiumListingRefSchema = z.strictObject({
  kind: premiumListingKindSchema,
  id: z.uuid(),
});

export const premiumListingsSchema = z.object({
  /** The most the free plan can keep published. */
  limit: z.number().int(),
  items: z.array(
    z.object({
      kind: premiumListingKindSchema,
      id: z.uuid(),
      title: z.string(),
      isPublished: z.boolean(),
    }),
  ),
  /** True while some listings were unpublished by the expiry and not yet chosen. */
  isSelectionOpen: z.boolean(),
});
export type PremiumListings = z.infer<typeof premiumListingsSchema>;

export const keepListingsSchema = z.strictObject({
  keep: z
    .array(premiumListingRefSchema)
    .max(PLAN_LIMITS.free.publishedListings)
    .refine(
      (items) => new Set(items.map((item) => `${item.kind}:${item.id}`)).size === items.length,
      {
        message: 'must not repeat a listing',
      },
    ),
});
export type KeepListingsInput = z.infer<typeof keepListingsSchema>;

// Admin

export const adminPaymentsQuerySchema = paginationQuerySchema.extend({
  businessId: z.uuid().optional(),
});

export const adminPaymentSchema = z.object({
  id: z.uuid(),
  businessId: z.uuid(),
  businessName: z.string(),
  amount: moneySchema,
  status: z.enum(['captured', 'failed', 'refund_pending', 'refunded']),
  isFirst: z.boolean(),
  capturedAt: z.iso.datetime().nullable(),
  /** Set while a full refund is still allowed. */
  refundableUntil: z.iso.datetime().nullable(),
  invoiceNumber: z.string().nullable(),
});
export type AdminPayment = z.infer<typeof adminPaymentSchema>;

export const refundPaymentSchema = z.strictObject({
  reason: z.string().trim().min(10).max(500),
});
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;

// Domain events (outbox types `premium.*`)

/**
 * `premium.activated`: the first payment of a Premium subscription was captured (webhook verified).
 * Consumed by referrals. `amountPaise` is an integer number of paise (JSON-safe). It fires once per
 * subscription, never on renewals, and `occurredAt` is when the payment was captured.
 */
export const premiumActivatedEventSchema = z.object({
  businessId: z.uuid(),
  /** The business owner. */
  userId: z.uuid(),
  paymentId: z.uuid(),
  amountPaise: z.number().int().min(1),
  currency: z.literal('INR'),
  occurredAt: z.iso.datetime(),
});
export type PremiumActivatedEvent = z.infer<typeof premiumActivatedEventSchema>;

/** `premium.refunded`: a first payment was refunded, so the Premium it bought ended. Same shape. */
export const premiumRefundedEventSchema = premiumActivatedEventSchema;
export type PremiumRefundedEvent = PremiumActivatedEvent;

export const PREMIUM_PRICE = { amountPaise: PREMIUM.pricePaise, currency: 'INR' } as const;
