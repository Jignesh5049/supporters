import type { SearchHit, SearchResponse } from '@supporters/shared';
import { describe, expect, it } from 'vitest';
import { listingResultPrice } from './result-cards';
import { suggestionHref } from './search-box';
import { flattenHits, hitId, nextActiveIndex } from './use-search';

const city = { id: '0199f4a0-0000-7000-8000-00000000000c', name: 'Pune', stateCode: 'MH' };
const business = {
  id: '0199f4a0-0000-7000-8000-00000000000b',
  slug: 'asha',
  name: 'Asha',
  logo: null,
  city,
  isVerified: false,
  isPremium: false,
};
const category = { id: city.id, name: 'Fasteners', slug: 'fasteners', parentId: null };
const listing = (id: string, overrides: object = {}) => ({
  id,
  kind: 'product' as const,
  business,
  title: 'Bolts',
  category,
  price: null,
  priceUnit: null,
  image: null,
  availability: 'in_stock' as const,
  moq: null,
  publishedAt: null,
  ...overrides,
});
const page = (data: SearchHit[]): SearchResponse => ({ data, nextCursor: null, estimatedTotal: 3 });

describe('search helpers', () => {
  it('flattens pages once per hit', () => {
    const a: SearchHit = { type: 'product', listing: listing('a') };
    const b: SearchHit = { type: 'product', listing: listing('b') };
    const flat = flattenHits({ pages: [page([a, b]), page([b])], pageParams: [] });
    expect(flat.map(hitId)).toEqual(['a', 'b']);
    expect(flattenHits(undefined)).toEqual([]);
  });

  it('moves through suggestions with wrapping', () => {
    expect(nextActiveIndex(-1, 'ArrowDown', 3)).toBe(0);
    expect(nextActiveIndex(2, 'ArrowDown', 3)).toBe(-1);
    expect(nextActiveIndex(-1, 'ArrowUp', 3)).toBe(2);
    expect(nextActiveIndex(0, 'ArrowUp', 3)).toBe(-1);
    expect(nextActiveIndex(0, 'ArrowDown', 0)).toBe(-1);
  });

  it('formats listing prices', () => {
    expect(listingResultPrice(listing('a'))).toBe('Ask for price');
    expect(
      listingResultPrice(
        listing('a', { price: { amountPaise: 45_000, currency: 'INR' }, priceUnit: 'kg' }),
      ),
    ).toMatch(/^₹450 \/ kg$/);
    expect(
      listingResultPrice(
        listing('a', { kind: 'service', price: { amountPaise: 200_000, currency: 'INR' } }),
      ),
    ).toMatch(/^From ₹2,000$/);
  });

  it('links suggestions to their pages', () => {
    expect(suggestionHref({ type: 'business', id: business.id, label: 'Asha', slug: 'asha' })).toBe(
      '/business/asha',
    );
    expect(suggestionHref({ type: 'product', id: 'p', label: 'Bolts', slug: null })).toBe(
      '/product/p',
    );
    expect(suggestionHref({ type: 'service', id: 's', label: 'Cutting', slug: null })).toBe(
      '/service/s',
    );
  });
});
