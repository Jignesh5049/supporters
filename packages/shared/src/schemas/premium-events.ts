import { z } from 'zod';

// Domain events written to the outbox by the Premium module and consumed by referrals.
// This is the contract between the two: change it only together.

/** A business's Premium payment was captured and the plan is active. */
export const premiumActivatedEventSchema = z.strictObject({
  businessId: z.uuid(),
  /** The business owner. */
  userId: z.uuid(),
  paymentId: z.uuid(),
  amountPaise: z.number().int().min(0),
  /** When the payment was captured. */
  occurredAt: z.iso.datetime(),
});
export type PremiumActivatedEvent = z.infer<typeof premiumActivatedEventSchema>;

/** A Premium payment was refunded. */
export const premiumRefundedEventSchema = premiumActivatedEventSchema.extend({
  refundId: z.uuid(),
});
export type PremiumRefundedEvent = z.infer<typeof premiumRefundedEventSchema>;
