import { describe, expect, it } from 'vitest';
import { PLAN_LIMITS, PREMIUM } from '../limits';
import {
  PREMIUM_PERKS,
  keepListingsSchema,
  premiumActivatedEventSchema,
  premiumCheckoutSchema,
  refundPaymentSchema,
} from './premium';

describe('premium', () => {
  it('prices the plan at 999 rupees in integer paise', () => {
    expect(PREMIUM.pricePaise).toBe(99_900);
    expect(Number.isInteger(PREMIUM.pricePaise)).toBe(true);
    expect(PREMIUM_PERKS).toContain('unlimited_listings');
  });

  it('takes only a valid buyer GSTIN at checkout, and nothing else', () => {
    expect(premiumCheckoutSchema.safeParse({}).success).toBe(true);
    expect(premiumCheckoutSchema.safeParse({ buyerGstin: 'nope' }).success).toBe(false);
    expect(premiumCheckoutSchema.safeParse({ amountPaise: 1 }).success).toBe(false);
  });

  it('caps the listings to keep at the free limit, without repeats', () => {
    const ref = (n: number) => ({
      kind: 'product' as const,
      id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    });
    const many = Array.from({ length: PLAN_LIMITS.free.publishedListings }, (_, i) => ref(i));
    expect(keepListingsSchema.safeParse({ keep: many }).success).toBe(true);
    expect(keepListingsSchema.safeParse({ keep: [...many, ref(99)] }).success).toBe(false);
    expect(keepListingsSchema.safeParse({ keep: [ref(1), ref(1)] }).success).toBe(false);
  });

  it('requires a real reason for a refund', () => {
    expect(refundPaymentSchema.safeParse({ reason: 'short' }).success).toBe(false);
    expect(refundPaymentSchema.safeParse({ reason: 'Asked within the 7 day window' }).success).toBe(
      true,
    );
  });

  it('describes the premium.activated payload', () => {
    const event = {
      businessId: '00000000-0000-4000-8000-000000000001',
      userId: '00000000-0000-4000-8000-000000000002',
      paymentId: '00000000-0000-4000-8000-000000000003',
      amountPaise: 99_900,
      currency: 'INR',
      occurredAt: '2026-11-14T10:00:00.000Z',
    };
    expect(premiumActivatedEventSchema.parse(event)).toEqual(event);
    expect(premiumActivatedEventSchema.safeParse({ ...event, amountPaise: 999.5 }).success).toBe(
      false,
    );
  });
});
