import { ApiError } from '../../lib/api/errors';
import {
  emptyQuoteForm,
  emptyRequirementForm,
  quoteErrorMessage,
  requirementBudget,
  requirementErrorMessage,
  requirementQuantity,
  requirementTimeLeft,
  requirementTitle,
  toQuoteInput,
  toRequirementInput,
} from './requirement-form';

const CATEGORY = '0a100000-0000-4000-8000-000000000001';
const CITY = '0f000000-0000-4000-8000-000000000001';
const IMAGE = '0e100000-0000-4000-8000-000000000001';
const PRODUCT = '0a200000-0000-4000-8000-000000000001';
const DESCRIPTION = 'Need 500 M8 zinc-plated bolts for our Pune plant.';

const filled = {
  ...emptyRequirementForm(),
  description: `  ${DESCRIPTION}  `,
  categoryId: CATEGORY,
  quantity: '500',
  unit: 'piece',
  deliveryCityId: CITY,
};

describe('toRequirementInput', () => {
  it('builds the API body with the budget in paise', () => {
    expect(toRequirementInput({ ...filled, budget: '1,25,000.50' }, [IMAGE])).toEqual({
      ok: true,
      input: {
        description: DESCRIPTION,
        categoryId: CATEGORY,
        quantity: 500,
        unit: 'piece',
        deliveryCityId: CITY,
        budget: { amountPaise: 12_500_050, currency: 'INR' },
        imageIds: [IMAGE],
      },
    });
    const noBudget = toRequirementInput(filled, []);
    expect(noBudget.ok && 'budget' in noBudget.input).toBe(false);
  });

  it('names each wrong field', () => {
    const result = toRequirementInput(
      { ...emptyRequirementForm(), description: 'too short', quantity: '0', budget: 'lots' },
      [],
    );
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

  it('explains the daily and open limits', () => {
    expect(
      requirementErrorMessage(new ApiError(429, 'RATE_LIMITED', { retryAfterSec: 7200 })),
    ).toBe('You can post 3 requirements a day. Try again in about 2 hours.');
    expect(requirementErrorMessage(new ApiError(409, 'REQUIREMENT_LIMIT_REACHED'))).toMatch(
      /already have 10 open/,
    );
  });
});

describe('toQuoteInput', () => {
  it('builds the quote with an optional listing', () => {
    expect(
      toQuoteInput({
        price: '₹1,500',
        message: 'Ready in 5 days.',
        listing: { type: 'product', id: PRODUCT },
      }),
    ).toEqual({
      ok: true,
      input: {
        price: { amountPaise: 150_000, currency: 'INR' },
        message: 'Ready in 5 days.',
        listing: { type: 'product', id: PRODUCT },
      },
    });
  });

  it('rejects a missing price and a short message', () => {
    expect(toQuoteInput({ ...emptyQuoteForm(), message: 'hi' })).toEqual({
      ok: false,
      errors: {
        price: 'Enter your price in rupees, like 1,25,000.',
        message: 'Write between 10 and 1,000 characters.',
      },
    });
  });

  it('explains a refused quote', () => {
    expect(quoteErrorMessage(new ApiError(403, 'BUSINESS_NOT_VERIFIED'))).toMatch(/verified/);
    expect(quoteErrorMessage(new ApiError(409, 'QUOTE_EXISTS'))).toMatch(/already quoted/);
  });
});

describe('card text', () => {
  const requirement = {
    description: 'Corrugated boxes, 3-ply\nMust hold 15 kg.',
    quantity: 50_000,
    unit: 'piece' as const,
    budget: { amountPaise: 45_000_000, currency: 'INR' as const },
    status: 'open' as const,
    expiresAt: '2026-11-10T12:00:00.000Z',
  };

  it('formats the title, quantity, budget and days left', () => {
    expect(requirementTitle(requirement)).toBe('Corrugated boxes, 3-ply');
    expect(requirementQuantity(requirement)).toBe('50,000 piece');
    expect(requirementBudget(requirement)).toMatch(/^₹4,50,000/);
    expect(requirementBudget({ budget: null })).toBe('Open to quotes');
    const now = new Date('2026-11-07T12:00:00.000Z');
    expect(requirementTimeLeft(requirement, now)).toBe('3 days left');
    expect(requirementTimeLeft({ ...requirement, status: 'closed' }, now)).toBe('Closed');
  });
});
