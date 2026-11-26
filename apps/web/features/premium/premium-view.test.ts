import type { PremiumStatus } from '@supporters/shared';
import { describe, expect, it } from 'vitest';
import { canBuy, canCancel, describeStatus, formatMoney } from './premium-view';

const base: PremiumStatus = {
  state: 'none',
  isPremium: false,
  autoRenew: false,
  expiresAt: null,
  renewsAt: null,
  graceEndsAt: null,
  refundableUntil: null,
  price: { amountPaise: 99_900, currency: 'INR' },
  perks: ['badge'],
  limits: { publishedListings: 25, postsPer7Days: 10 },
  heldListingCount: 0,
};

describe('premium view', () => {
  it('formats integer paise as rupees', () => {
    expect(formatMoney({ amountPaise: 99_900 })).toBe('₹999');
    expect(formatMoney({ amountPaise: 84_661 })).toBe('₹846.61');
    expect(formatMoney({ amountPaise: 1_23_45_600 })).toBe('₹1,23,456');
  });

  it('offers the purchase only when there is no Premium to extend', () => {
    expect(canBuy(base)).toBe(true);
    expect(canBuy({ ...base, state: 'expired' })).toBe(true);
    expect(canBuy({ ...base, state: 'pending' })).toBe(true);
    expect(canBuy({ ...base, state: 'active', isPremium: true, autoRenew: true })).toBe(false);
    expect(canBuy({ ...base, state: 'grace', isPremium: true })).toBe(false);
  });

  it('offers cancel only while auto-renew is on', () => {
    const active = { ...base, state: 'active', isPremium: true } as const;
    expect(canCancel({ ...active, autoRenew: true })).toBe(true);
    expect(canCancel({ ...active, autoRenew: false })).toBe(false);
    expect(canCancel(base)).toBe(false);
  });

  it('describes grace, cancelled, expired and free states', () => {
    const grace = describeStatus({
      ...base,
      state: 'grace',
      isPremium: true,
      graceEndsAt: '2026-12-01T00:00:00.000Z',
    });
    expect(grace.tone).toBe('warning');
    expect(grace.body).toContain('1 December 2026');
    const cancelled = describeStatus({
      ...base,
      state: 'active',
      isPremium: true,
      autoRenew: false,
      expiresAt: '2027-03-01T00:00:00.000Z',
    });
    expect(cancelled.title).toContain('will not renew');
    expect(describeStatus({ ...base, state: 'expired' }).body).toContain('Nothing was deleted');
    expect(describeStatus(base).title).toContain('free plan');
  });
});
