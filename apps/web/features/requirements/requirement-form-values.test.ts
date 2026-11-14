import type { Requirement } from '@supporters/shared';
import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import {
  emptyQuote,
  emptyRequirement,
  quoteErrorMessage,
  requirementBudget,
  requirementError,
  requirementQuantity,
  requirementTimeLeft,
  requirementTitle,
  toQuoteBody,
  toRequirementBody,
} from './requirement-form-values';

const CATEGORY = '0a100000-0000-4000-8000-000000000001';
const CITY = '0f000000-0000-4000-8000-000000000001';
const IMAGE = '0e100000-0000-4000-8000-000000000001';
const PRODUCT = '0a200000-0000-4000-8000-000000000001';
const DESCRIPTION = 'Need 500 M8 zinc-plated bolts for our Pune plant.';

const filled = {
  ...emptyRequirement(),
  description: `  ${DESCRIPTION}  `,
  categoryId: CATEGORY,
  quantity: '500',
  unit: 'piece',
  deliveryCityId: CITY,
};

describe('toRequirementBody', () => {
  it('builds the API body, with the budget in paise and images in order', () => {
    expect(toRequirementBody({ ...filled, budget: '1,25,000.50', imageIds: [IMAGE] })).toEqual({
      ok: true,
      body: {
        description: DESCRIPTION,
        categoryId: CATEGORY,
        quantity: 500,
        unit: 'piece',
        deliveryCityId: CITY,
        budget: { amountPaise: 12_500_050, currency: 'INR' },
        imageIds: [IMAGE],
      },
    });
    const noBudget = toRequirementBody(filled);
    expect(noBudget.ok && 'budget' in noBudget.body).toBe(false);
  });

  it('names each field that is wrong', () => {
    const result = toRequirementBody({
      ...emptyRequirement(),
      description: 'too short',
      quantity: '2.5',
      budget: 'lots',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual([
      'budget',
      'categoryId',
      'deliveryCityId',
      'description',
      'quantity',
      'unit',
    ]);
  });
});

describe('requirementError', () => {
  it('explains the daily and open limits', () => {
    const daily = new ApiError({ status: 429, code: 'RATE_LIMITED', title: 'x', retryAfter: 7200 });
    expect(requirementError(daily).message).toBe(
      'You can post 3 requirements a day. Try again in about 2 hours.',
    );
    const open = new ApiError({ status: 409, code: 'REQUIREMENT_LIMIT_REACHED', title: 'x' });
    expect(requirementError(open).message).toMatch(/already have 10 open requirements/);
  });

  it('maps API field errors to the form', () => {
    const error = new ApiError({
      status: 400,
      code: 'VALIDATION_FAILED',
      title: 'x',
      fieldErrors: [{ path: 'body.deliveryCityId', message: 'Unknown city' }],
    });
    expect(requirementError(error).fields).toEqual({ deliveryCityId: 'Unknown city' });
  });
});

describe('toQuoteBody', () => {
  it('builds the quote with an optional listing', () => {
    expect(
      toQuoteBody({ price: '₹1,500', message: 'Ready in 5 days.', listing: `product:${PRODUCT}` }),
    ).toEqual({
      ok: true,
      body: {
        price: { amountPaise: 150_000, currency: 'INR' },
        message: 'Ready in 5 days.',
        listing: { type: 'product', id: PRODUCT },
      },
    });
    const bare = toQuoteBody({ ...emptyQuote(), price: '99', message: 'Ready in 5 days.' });
    expect(bare.ok && 'listing' in bare.body).toBe(false);
  });

  it('rejects a zero price and a short message', () => {
    expect(toQuoteBody({ ...emptyQuote(), price: '0', message: 'hi' })).toEqual({
      ok: false,
      errors: {
        price: 'Enter your price in rupees, like 1,25,000.',
        message: 'Write between 10 and 1,000 characters.',
      },
    });
  });

  it('explains a refused quote', () => {
    const code = (c: string) =>
      quoteErrorMessage(new ApiError({ status: 403, code: c, title: 'x' }));
    expect(code('BUSINESS_NOT_VERIFIED')).toMatch(/verified businesses/);
    expect(code('QUOTE_EXISTS')).toMatch(/already quoted/);
    expect(code('REQUIREMENT_NOT_OPEN')).toMatch(/no longer open/);
  });
});

describe('card text', () => {
  const requirement = {
    description: 'Corrugated boxes, 3-ply\nMust hold 15 kg.',
    quantity: 50_000,
    unit: 'piece',
    budget: { amountPaise: 45_000_000, currency: 'INR' },
    status: 'open',
    expiresAt: '2026-11-10T12:00:00.000Z',
  } as const satisfies Partial<Requirement>;

  it('formats the title, quantity and budget', () => {
    expect(requirementTitle(requirement)).toBe('Corrugated boxes, 3-ply');
    expect(requirementQuantity(requirement)).toBe('50,000 piece');
    expect(requirementBudget(requirement)).toBe('₹4,50,000');
    expect(requirementBudget({ budget: null })).toBe('Open to quotes');
  });

  it('counts the days left, or shows the final status', () => {
    const now = new Date('2026-11-07T12:00:00.000Z');
    expect(requirementTimeLeft(requirement, now)).toBe('3 days left');
    expect(
      requirementTimeLeft({ ...requirement, expiresAt: '2026-11-07T20:00:00.000Z' }, now),
    ).toBe('Expires today');
    expect(requirementTimeLeft({ ...requirement, status: 'fulfilled' }, now)).toBe('Fulfilled');
  });
});
