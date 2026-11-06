import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { emptyEnquiry, enquiryError, toEnquiryBody, waitText } from './enquiry-form-values';

const PRODUCT = { type: 'product', id: '0a200000-0000-4000-8000-000000000001' } as const;
const CITY = '0f000000-0000-4000-8000-000000000001';
const MESSAGE = 'Please share your best wholesale rate for 50 pieces.';

describe('toEnquiryBody', () => {
  it('builds the API body from the form, with the listing as productId or serviceId', () => {
    const result = toEnquiryBody({
      ...emptyEnquiry(PRODUCT),
      quantity: '50',
      unit: 'piece',
      deliveryCityId: CITY,
      message: `  ${MESSAGE}  `,
      sharePhone: true,
    });
    expect(result).toEqual({
      ok: true,
      body: {
        productId: PRODUCT.id,
        quantity: 50,
        unit: 'piece',
        deliveryCityId: CITY,
        message: MESSAGE,
        sharePhone: true,
      },
    });
    const service = toEnquiryBody({
      ...emptyEnquiry({ type: 'service', id: PRODUCT.id }),
      message: MESSAGE,
    });
    expect(service).toMatchObject({ ok: true, body: { serviceId: PRODUCT.id, sharePhone: false } });
  });

  it('leaves optional fields out and shares the phone only when ticked', () => {
    const result = toEnquiryBody({ ...emptyEnquiry(PRODUCT), message: MESSAGE });
    expect(result).toEqual({
      ok: true,
      body: { productId: PRODUCT.id, message: MESSAGE, sharePhone: false },
    });
  });

  it('reports each field the shared schema refuses', () => {
    const result = toEnquiryBody({
      ...emptyEnquiry(),
      quantity: '2.5',
      unit: 'barrels',
      message: 'Too short',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(['listing', 'message', 'quantity', 'unit']);
    expect(result.errors.message).toBe('Write between 20 and 1,000 characters.');
    expect(toEnquiryBody({ ...emptyEnquiry(PRODUCT), message: 'x'.repeat(1_001) }).ok).toBe(false);
    expect(toEnquiryBody({ ...emptyEnquiry(PRODUCT), quantity: '0', message: MESSAGE }).ok).toBe(
      false,
    );
  });
});

describe('enquiryError', () => {
  it('explains both enquiry limits with the wait from Retry-After', () => {
    const error = new ApiError({
      status: 429,
      code: 'RATE_LIMITED',
      title: 'Too many',
      retryAfter: 5 * 3600 + 10,
    });
    expect(enquiryError(error).message).toBe(
      'You can send one enquiry per listing every 24 hours, and 20 a day. Try again in about 6 hours.',
    );
  });

  it('maps API field errors back onto the form', () => {
    const error = new ApiError({
      status: 400,
      code: 'VALIDATION_FAILED',
      title: 'Invalid',
      fieldErrors: [
        { path: 'body.serviceId', message: 'Not found' },
        { path: 'body.message', message: 'Too short' },
      ],
    });
    expect(enquiryError(error).fields).toEqual({ listing: 'Not found', message: 'Too short' });
  });

  it('says when a block stops the enquiry', () => {
    expect(
      enquiryError(new ApiError({ status: 403, code: 'BLOCKED', title: 'Blocked' })).message,
    ).toBe('You can’t send enquiries to this business.');
  });

  it('rounds waits up', () => {
    expect(waitText(undefined)).toBe('a moment');
    expect(waitText(61)).toBe('about 2 minutes');
    expect(waitText(3600)).toBe('about 1 hour');
    expect(waitText(3601)).toBe('about 2 hours');
  });
});
