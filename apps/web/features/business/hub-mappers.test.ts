import { describe, expect, it } from 'vitest';
import { ApiError, formFieldErrors } from '@/lib/api/errors';
import { productFixture, serviceFixture } from '@/lib/catalog/fixtures';
import { firstError } from './form-errors';
import { toListingRow } from './hub-mappers';
import { isAtLimit, listingUsage } from './listing-limit';

describe('listing limit', () => {
  it('is reached at the free plan cap and never on Premium', () => {
    expect(isAtLimit({ published: 24, limit: 25 })).toBe(false);
    expect(isAtLimit({ published: 25, limit: 25 })).toBe(true);
    expect(isAtLimit({ published: 400, limit: null })).toBe(false);
    expect(listingUsage({ published: 3, limit: 25 })).toBe('3 of 25 published listings used');
    expect(listingUsage({ published: 3, limit: null })).toBeNull();
  });
});

describe('toListingRow', () => {
  it('gives the table plain strings and the public path', () => {
    expect(toListingRow(productFixture)).toEqual({
      id: productFixture.id,
      title: 'Cotton poplin',
      imageUrl: 'https://media.example/a.webp',
      category: 'Textiles',
      priceText: '₹149.50 / metre',
      status: 'published',
      publicHref: `/product/${productFixture.id}`,
    });
    expect(toListingRow({ ...serviceFixture, images: [] })).toMatchObject({
      imageUrl: null,
      priceText: 'Ask for price',
      publicHref: `/service/${serviceFixture.id}`,
    });
  });
});

describe('form errors', () => {
  it('maps API body paths to form fields and ignores others', () => {
    const error = new ApiError({
      status: 400,
      code: 'VALIDATION_FAILED',
      title: 'Invalid',
      fieldErrors: [
        { path: 'body.mediaIds', message: 'Add at least one image to publish' },
        { path: 'query.state', message: 'Unknown state' },
      ],
    });
    expect(formFieldErrors(error)).toEqual([
      { name: 'mediaIds', message: 'Add at least one image to publish' },
    ]);
    expect(formFieldErrors(new Error('x'))).toEqual([]);
  });

  it('finds the first message in a nested error tree, skipping DOM refs', () => {
    const ref = { message: 'not this' };
    expect(firstError({ amountPaise: { message: 'Enter a number', ref } })).toBe('Enter a number');
    expect(firstError([undefined, { key: { message: 'Required' } }])).toBe('Required');
    expect(firstError(undefined)).toBeUndefined();
  });
});
