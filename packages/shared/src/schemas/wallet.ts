import { z } from 'zod';
import { paginationQuerySchema } from './common';

// Referrals and the wallet (product spec, Monetization, wallet and Business Hub; backend spec,
// Security: Payments and money). Money is integer paise.

export const paiseSchema = z.number().int();
export const moneyOutSchema = z.object({ amountPaise: paiseSchema, currency: z.literal('INR') });

export const ReferralStatus = {
  Pending: 'pending',
  Successful: 'successful',
  Ineligible: 'ineligible',
  Failed: 'failed',
} as const;
export type ReferralStatus = (typeof ReferralStatus)[keyof typeof ReferralStatus];

/** Why a referral is in its status; shown to the referrer. */
export const ReferralReason = {
  AwaitingPremium: 'awaiting_premium',
  RefundWindow: 'refund_window',
  Credited: 'credited',
  /** Reward is ₹0 once the lifetime cap is reached. */
  CapReached: 'cap_reached',
  SelfReferral: 'self_referral',
  PhoneReused: 'phone_reused',
  DeviceReused: 'device_reused',
  AttestationFailed: 'attestation_failed',
  PaymentRefunded: 'payment_refunded',
  AccountSuspended: 'account_suspended',
  /** Premium was never bought within the allowed time. */
  NeverPurchased: 'never_purchased',
} as const;
export type ReferralReason = (typeof ReferralReason)[keyof typeof ReferralReason];

export const referralSchema = z.object({
  id: z.uuid(),
  /** First name and initial only, never contact details. */
  referredName: z.string(),
  status: z.enum(ReferralStatus),
  reason: z.enum(ReferralReason),
  reward: moneyOutSchema.nullable(),
  /** Pending referrals with Premium bought: when the refund window ends. */
  eligibleAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type Referral = z.infer<typeof referralSchema>;

export const referralsResponseSchema = z.object({
  code: z.string(),
  stats: z.object({
    pending: z.number().int(),
    successful: z.number().int(),
    ineligible: z.number().int(),
    failed: z.number().int(),
    totalEarned: moneyOutSchema,
    /** What more referrals can still earn under the lifetime cap. */
    remainingToCap: moneyOutSchema,
  }),
  data: z.array(referralSchema),
  nextCursor: z.string().nullable(),
});
export type ReferralsResponse = z.infer<typeof referralsResponseSchema>;

export const referralsQuerySchema = paginationQuerySchema;

export const LedgerEntryType = {
  ReferralReward: 'referral_reward',
  Bonus: 'bonus',
  Reversal: 'reversal',
  Withdrawal: 'withdrawal',
} as const;
export type LedgerEntryType = (typeof LedgerEntryType)[keyof typeof LedgerEntryType];

export const walletSchema = z.object({
  balance: moneyOutSchema,
  /** Funds reserved by the pending or processing withdrawal (already out of the balance). */
  reserved: moneyOutSchema,
  lifetimeEarned: moneyOutSchema,
  minWithdrawal: moneyOutSchema,
});
export type Wallet = z.infer<typeof walletSchema>;

export const ledgerEntrySchema = z.object({
  id: z.uuid(),
  type: z.enum(LedgerEntryType),
  /** Signed: rewards and bonuses are positive, withdrawals negative. */
  amount: moneyOutSchema,
  /** Shown to the user: a referral, a withdrawal, or the admin's reason for a bonus. */
  description: z.string(),
  createdAt: z.iso.datetime(),
});
export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;
