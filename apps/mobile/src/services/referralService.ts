/**
 * Supporters Referral & Earn Business Logic
 * Rule Definition:
 * - 1st successful referral: ₹300
 * - 2nd successful referral: ₹200
 * - 3rd and subsequent referrals: ₹0
 * - Maximum total referral reward per user: ₹500
 */

export const REFERRAL_REWARD_CONFIG = {
  firstReferralReward: 300,
  secondReferralReward: 200,
  subsequentReward: 0,
  maxTotalReward: 500,
  currencySymbol: '₹',
  minWithdrawalAmount: 100,
} as const;

export function calculateReferralEarnings(successfulReferralsCount: number): number {
  if (successfulReferralsCount <= 0) return 0;
  if (successfulReferralsCount === 1) return REFERRAL_REWARD_CONFIG.firstReferralReward;
  // 2 or more referrals capped at ₹500
  return REFERRAL_REWARD_CONFIG.maxTotalReward;
}

export function getReferralMilestoneStatus(successfulCount: number) {
  return {
    milestone1Completed: successfulCount >= 1,
    milestone1Amount: REFERRAL_REWARD_CONFIG.firstReferralReward,
    milestone2Completed: successfulCount >= 2,
    milestone2Amount: REFERRAL_REWARD_CONFIG.secondReferralReward,
    totalEarned: calculateReferralEarnings(successfulCount),
    maxLimitReached: successfulCount >= 2,
    remainingToMax: Math.max(
      0,
      REFERRAL_REWARD_CONFIG.maxTotalReward - calculateReferralEarnings(successfulCount),
    ),
  };
}

export type ReferralMilestoneStatus = ReturnType<typeof getReferralMilestoneStatus>;
