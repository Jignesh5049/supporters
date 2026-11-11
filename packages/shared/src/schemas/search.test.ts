import { describe, expect, it } from 'vitest';
import { PAGINATION, SEARCH_LIMITS } from '../limits';
import { searchQuerySchema, suggestQuerySchema } from './search';

describe('searchQuerySchema', () => {
  it('defaults to businesses by relevance', () => {
    expect(searchQuerySchema.parse({})).toEqual({
      q: '',
      type: 'business',
      sort: 'relevance',
      limit: PAGINATION.defaultLimit,
    });
  });

  it('coerces query-string values', () => {
    const query = searchQuerySchema.parse({
      q: '  cotton  ',
      type: 'product',
      state: 'mh',
      verified: 'true',
      priceMin: '100',
      priceMax: '5000',
      moqMax: '50',
      availability: 'in_stock',
      sort: 'price_asc',
      limit: '10',
    });
    expect(query).toMatchObject({
      q: 'cotton',
      state: 'MH',
      verified: true,
      priceMin: 100,
      priceMax: 5000,
      moqMax: 50,
      limit: 10,
    });
  });

  it('rejects a price range upside down', () => {
    expect(searchQuerySchema.safeParse({ priceMin: '500', priceMax: '100' }).success).toBe(false);
  });

  it('rejects unknown params, bad slugs and long queries', () => {
    expect(searchQuerySchema.safeParse({ foo: 'bar' }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ category: 'Not A Slug' }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ verified: 'yes' }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ ratingMin: '6' }).success).toBe(false);
    const q = 'a'.repeat(SEARCH_LIMITS.queryMax + 1);
    expect(searchQuerySchema.safeParse({ q }).success).toBe(false);
  });
});

describe('suggestQuerySchema', () => {
  it('needs two characters after trimming', () => {
    expect(suggestQuerySchema.safeParse({ q: ' a ' }).success).toBe(false);
    expect(suggestQuerySchema.parse({ q: ' ab ' })).toEqual({ q: 'ab' });
  });
});
