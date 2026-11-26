import type { PremiumStatus } from '@supporters/shared';
import { PERK_LABELS, premiumCopy } from './premium-copy';

const base: PremiumStatus = {
  state: 'none',
  isPremium: false,
  autoRenew: false,
  expiresAt: null,
  renewsAt: null,
  graceEndsAt: null,
  refundableUntil: null,
  price: { amountPaise: 99_900, currency: 'INR' },
  perks: ['badge', 'featured'],
  limits: { publishedListings: 25, postsPer7Days: 10 },
  heldListingCount: 0,
};

describe('premiumCopy', () => {
  it('says active with the renewal date', () => {
    const copy = premiumCopy({
      ...base,
      state: 'active',
      isPremium: true,
      autoRenew: true,
      renewsAt: '2027-03-01T00:00:00.000Z',
    });
    expect(copy).toMatchObject({ pill: 'Active', tone: 'active' });
    expect(copy.detail).toContain('Renews on');
    expect(copy.detail).toContain('2027');
  });

  it('warns when it will not renew, and during the grace period', () => {
    const cancelled = premiumCopy({
      ...base,
      state: 'active',
      isPremium: true,
      expiresAt: '2027-03-01T00:00:00.000Z',
    });
    expect(cancelled).toMatchObject({ pill: 'Ends soon', tone: 'warning' });
    const grace = premiumCopy({
      ...base,
      state: 'grace',
      isPremium: true,
      graceEndsAt: '2026-12-01T00:00:00.000Z',
    });
    expect(grace.tone).toBe('warning');
    expect(grace.detail).toContain('2026');
  });

  it('describes expired, pending and free without deleting anything', () => {
    expect(premiumCopy({ ...base, state: 'expired' }).detail).toContain('Nothing was deleted');
    expect(premiumCopy({ ...base, state: 'pending' }).pill).toBe('Waiting');
    expect(premiumCopy(base).title).toBe('Supporters Free');
  });

  it('labels every perk the API can send', () => {
    for (const perk of [
      'badge',
      'featured',
      'search_boost',
      'unlimited_listings',
      'unlimited_posts',
      'analytics_history',
      'requirement_priority',
    ] as const) {
      expect(PERK_LABELS[perk]).toBeTruthy();
    }
  });
});
