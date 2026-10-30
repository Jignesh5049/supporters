import { describe, expect, it } from 'vitest';
import { MEDIA_LIMITS, PAGINATION, PLAN_LIMITS, REFERRAL, TEXT_LIMITS, WALLET } from './limits';

describe('limits', () => {
  it('keeps every text range ordered', () => {
    for (const [name, range] of Object.entries(TEXT_LIMITS)) {
      const min = 'min' in range ? range.min : 0;
      expect(min, name).toBeLessThan(range.max);
    }
  });

  it('caps referral rewards at the lifetime limit', () => {
    const total = REFERRAL.rewardsPaise.reduce((sum, paise) => sum + paise, 0);
    expect(total).toBe(REFERRAL.lifetimeCapPaise);
  });

  it('lets a full referral payout be withdrawn', () => {
    expect(WALLET.minWithdrawalPaise).toBeLessThanOrEqual(REFERRAL.lifetimeCapPaise);
  });

  it('gives Premium at least the free plan limits', () => {
    for (const key of Object.keys(PLAN_LIMITS.free) as (keyof typeof PLAN_LIMITS.free)[]) {
      expect(PLAN_LIMITS.premium[key], key).toBeGreaterThanOrEqual(PLAN_LIMITS.free[key]);
    }
  });

  it('uses a default page size within the maximum', () => {
    expect(PAGINATION.defaultLimit).toBeLessThanOrEqual(PAGINATION.maxLimit);
  });

  it('allows at least one image per listing and post', () => {
    expect(MEDIA_LIMITS.imagesPerListing.min).toBeGreaterThanOrEqual(1);
    expect(MEDIA_LIMITS.imagesPerPost.min).toBeGreaterThanOrEqual(1);
  });
});
