import { type ReferralReason, ReferralStatus, WithdrawalStatus } from '@supporters/shared';

/** Paise to rupees for display: "₹1,250" or "₹1,250.50". Whole rupees drop the decimals. */
export function formatRupees(paise: number): string {
  const isWhole = paise % 100 === 0;
  return `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

/** A rupee amount typed by the user to integer paise, or null when it is not a valid amount. */
export function rupeesToPaise(text: string): number | null {
  const match = /^\s*(\d{1,7})(?:\.(\d{1,2}))?\s*$/.exec(text);
  if (!match) return null;
  const paise = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0') || 0);
  return paise > 0 ? paise : null;
}

export const REFERRAL_STATUS_LABELS: Record<ReferralStatus, string> = {
  [ReferralStatus.Pending]: 'Pending',
  [ReferralStatus.Successful]: 'Successful',
  [ReferralStatus.Ineligible]: 'Not eligible',
  [ReferralStatus.Failed]: 'Expired',
};

/** What the referrer reads under each referral: every status says why. */
export const REFERRAL_REASON_LABELS: Record<ReferralReason, string> = {
  awaiting_premium: 'Waiting for their business to buy Premium',
  refund_window: 'Premium bought. The reward is credited after the 7-day refund window',
  credited: 'Reward credited to your wallet',
  cap_reached: 'You have reached the ₹500 lifetime limit, so there is no further reward',
  self_referral: 'This looks like your own account',
  phone_reused: 'This phone number was already used for a referral',
  device_reused: 'This device was already used for a referral',
  attestation_failed: 'The device could not be verified',
  payment_refunded: 'The Premium payment was refunded',
  account_suspended: 'An account involved was suspended',
  never_purchased: 'They did not buy Premium in time',
};

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  [WithdrawalStatus.Pending]: 'Waiting for approval',
  [WithdrawalStatus.Processing]: 'Being paid out',
  [WithdrawalStatus.Completed]: 'Paid',
  [WithdrawalStatus.Rejected]: 'Rejected',
  [WithdrawalStatus.Failed]: 'Failed, money returned',
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
