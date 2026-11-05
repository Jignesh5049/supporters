import { ApiError } from '../../lib/api/errors';
import { uuid } from '../social/fixtures';
import {
  createKeyRing,
  emptyEnquiryForm,
  enquiryErrorMessage,
  toEnquiryDraft,
  type EnquiryFormValues,
} from './enquiry-form';

jest.mock('../../lib/api', () => jest.requireActual('../../lib/api/errors'));

const valid = (overrides: Partial<EnquiryFormValues> = {}): EnquiryFormValues => ({
  ...emptyEnquiryForm({ type: 'product', id: uuid(1) }),
  message: 'Please share a quote for 250 pieces with delivery.',
  ...overrides,
});

describe('toEnquiryDraft', () => {
  it('builds the body for a product with the phone consent off by default', () => {
    const result = toEnquiryDraft(valid());
    expect(result).toEqual({
      ok: true,
      draft: {
        productId: uuid(1),
        message: 'Please share a quote for 250 pieces with delivery.',
        sharePhone: false,
      },
    });
  });

  it('sends a service as serviceId and carries quantity, unit, city and consent', () => {
    const result = toEnquiryDraft(
      valid({
        listing: { type: 'service', id: uuid(2) },
        quantity: '250',
        unit: 'piece',
        deliveryCityId: uuid(3),
        sharePhone: true,
      }),
    );
    expect(result).toMatchObject({
      ok: true,
      draft: {
        serviceId: uuid(2),
        quantity: 250,
        unit: 'piece',
        deliveryCityId: uuid(3),
        sharePhone: true,
      },
    });
    expect(result.ok && 'productId' in result.draft).toBe(false);
  });

  it('asks for a listing and a 20 to 1,000 character message', () => {
    const result = toEnquiryDraft(valid({ listing: null, message: 'too short' }));
    expect(result.ok).toBe(false);
    expect(!result.ok && Object.keys(result.errors).sort()).toEqual(['listing', 'message']);
    expect(toEnquiryDraft(valid({ message: 'x'.repeat(1001) })).ok).toBe(false);
  });

  it('rejects a zero or oversized quantity', () => {
    expect(toEnquiryDraft(valid({ quantity: '0' })).ok).toBe(false);
    expect(toEnquiryDraft(valid({ quantity: '99999999' })).ok).toBe(false);
  });
});

describe('enquiryErrorMessage', () => {
  it('explains the rate limit with the real limits and the wait', () => {
    const text = enquiryErrorMessage(new ApiError(429, 'RATE_LIMITED', { retryAfterSec: 7200 }));
    expect(text).toContain('20 enquiries a day');
    expect(text).toContain('24 hours');
    expect(text).toContain('2 h');
  });

  it('maps blocks and missing listings, never raw server text', () => {
    expect(enquiryErrorMessage(new ApiError(403, 'BLOCKED'))).toMatch(/can't send/);
    expect(enquiryErrorMessage(new ApiError(404, 'NOT_FOUND'))).toMatch(/no longer available/);
    expect(enquiryErrorMessage(new Error('boom'))).toBe('Something went wrong. Try again.');
  });
});

describe('createKeyRing', () => {
  it('reuses the Idempotency-Key for a retry of the same body and renews it on change', () => {
    let n = 0;
    const ring = createKeyRing(() => `key-${(n += 1)}`);
    const a = { productId: uuid(1), message: 'a'.repeat(25), sharePhone: false };
    expect(ring.keyFor(a)).toBe('key-1');
    expect(ring.keyFor({ ...a })).toBe('key-1');
    expect(ring.keyFor({ ...a, message: 'b'.repeat(25) })).toBe('key-2');
    ring.reset();
    expect(ring.keyFor(a)).toBe('key-3');
  });
});
