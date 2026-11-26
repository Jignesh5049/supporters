import { z } from 'zod';
import { WALLET } from '../limits';
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

// Payout account and withdrawals.

export const PayoutMethod = { Upi: 'upi', Bank: 'bank' } as const;
export type PayoutMethod = (typeof PayoutMethod)[keyof typeof PayoutMethod];

const holderNameSchema = z.string().trim().min(2).max(100);

/** `name@bank`: 2 to 256 characters before the `@`, letters after it. */
export const upiIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9.\-_]{2,256}@[a-z][a-z0-9]{1,63}$/, 'Enter a valid UPI id');
export const ifscSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Enter a valid IFSC');
export const bankAccountNumberSchema = z
  .string()
  .trim()
  .regex(/^\d{9,18}$/, 'Enter a valid account number');

/** `PUT /me/payout-account`: UPI or bank, never both. */
export const putPayoutAccountSchema = z.discriminatedUnion('method', [
  z.strictObject({ method: z.literal('upi'), upiId: upiIdSchema, holderName: holderNameSchema }),
  z.strictObject({
    method: z.literal('bank'),
    accountNumber: bankAccountNumberSchema,
    ifsc: ifscSchema,
    holderName: holderNameSchema,
  }),
]);
export type PutPayoutAccountInput = z.infer<typeof putPayoutAccountSchema>;

export const PayoutValidationStatus = {
  Pending: 'pending',
  Validated: 'validated',
  Failed: 'failed',
} as const;
export type PayoutValidationStatus =
  (typeof PayoutValidationStatus)[keyof typeof PayoutValidationStatus];

/** Never holds the full UPI id or account number: only a masked form. */
export const payoutAccountSchema = z.object({
  method: z.enum(PayoutMethod),
  holderName: z.string(),
  maskedDestination: z.string(),
  validationStatus: z.enum(PayoutValidationStatus),
  isNameMatch: z.boolean(),
  updatedAt: z.iso.datetime(),
  /** Withdrawals are blocked until this time after the details change. */
  withdrawalsAllowedAt: z.iso.datetime(),
});
export type PayoutAccount = z.infer<typeof payoutAccountSchema>;

export const payoutAccountResponseSchema = z.object({ account: payoutAccountSchema.nullable() });

export const WithdrawalStatus = {
  Pending: 'pending',
  Processing: 'processing',
  Completed: 'completed',
  Rejected: 'rejected',
  Failed: 'failed',
} as const;
export type WithdrawalStatus = (typeof WithdrawalStatus)[keyof typeof WithdrawalStatus];

export const createWithdrawalSchema = z.strictObject({
  amountPaise: z.number().int().min(1).max(10_000_000_00),
});
export type CreateWithdrawalInput = z.infer<typeof createWithdrawalSchema>;

export const withdrawalSchema = z.object({
  id: z.uuid(),
  amount: moneyOutSchema,
  status: z.enum(WithdrawalStatus),
  method: z.enum(PayoutMethod),
  maskedDestination: z.string(),
  /** Why an admin rejected it, or why the payout failed (generic). */
  reason: z.string().nullable(),
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
});
export type Withdrawal = z.infer<typeof withdrawalSchema>;

// Admin: withdrawals and bonuses (backend spec, Endpoint map: Admin).

export const adminWithdrawalsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(WithdrawalStatus).default('pending'),
});
export type AdminWithdrawalsQuery = z.infer<typeof adminWithdrawalsQuerySchema>;

export const adminWithdrawalSchema = z.object({
  id: z.uuid(),
  user: z.object({ id: z.uuid(), name: z.string() }),
  amount: moneyOutSchema,
  status: z.enum(WithdrawalStatus),
  method: z.enum(PayoutMethod),
  /** Masked only: admins approve and RazorpayX pays; nobody reads the full number. */
  maskedDestination: z.string(),
  holderName: z.string(),
  /** The name the bank holds for the account, when RazorpayX returned one. */
  registeredName: z.string().nullable(),
  validationStatus: z.enum(PayoutValidationStatus),
  /** The holder name did not match the profile name: look closer before approving. */
  isNameMismatch: z.boolean(),
  /** Hours the payout details had been in place when the withdrawal was requested. */
  payoutAccountAgeHours: z.number().int(),
  rejectionReason: z.string().nullable(),
  failureReason: z.string().nullable(),
  reviewer: z.object({ id: z.uuid(), name: z.string() }).nullable(),
  reviewedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  completedAt: z.iso.datetime().nullable(),
});
export type AdminWithdrawal = z.infer<typeof adminWithdrawalSchema>;

export const rejectWithdrawalSchema = z.strictObject({
  reason: z.string().trim().min(5).max(300),
});
export type RejectWithdrawalInput = z.infer<typeof rejectWithdrawalSchema>;

/** The most one bonus can credit, in paise (assumption: ₹10,000; the client sets the real cap). */
export const MAX_BONUS_PAISE = WALLET.maxBonusPaise;

export const adminBonusSchema = z.strictObject({
  userId: z.uuid(),
  amountPaise: z.number().int().min(1).max(MAX_BONUS_PAISE),
  /** Shown to the user in their ledger, and kept in the audit log. */
  reason: z.string().trim().min(5).max(200),
});
export type AdminBonusInput = z.infer<typeof adminBonusSchema>;
