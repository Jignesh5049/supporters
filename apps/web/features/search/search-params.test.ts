import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  clearFilters,
  filtersFor,
  parseSearchState,
  searchApiPath,
  searchHref,
  sortOptions,
  toSearchParams,
  withType,
} from './search-params';

const CITY = '0199f4a0-0000-7000-8000-000000000001';
const parse = (query: string) => parseSearchState(new URLSearchParams(query));

describe('parseSearchState', () => {
  it('defaults to businesses by relevance', () => {
    expect(parse('')).toEqual({ q: '', type: 'business', sort: 'relevance' });
  });

  it('keeps valid params and drops invalid ones one by one', () => {
    expect(
      parse(
        `q=bolts&type=product&city=${CITY}&state=mh&verified=true&priceMin=100&moqMax=abc&sort=nope`,
      ),
    ).toEqual({
      q: 'bolts',
      type: 'product',
      sort: 'relevance',
      city: CITY,
      state: 'MH',
      verified: true,
      priceMin: 100,
    });
  });

  it('drops the maximum of an upside-down price range', () => {
    expect(parse('type=product&priceMin=500&priceMax=100')).toMatchObject({ priceMin: 500 });
    expect(parse('type=product&priceMin=500&priceMax=100')).not.toHaveProperty('priceMax');
  });
});

describe('toSearchParams', () => {
  it('round-trips and leaves out defaults', () => {
    const query = `q=bolts&type=product&city=${CITY}&priceMax=900&sort=price_asc`;
    const state = parse(query);
    expect(parseSearchState(toSearchParams(state))).toEqual(state);
    expect(toSearchParams(parse('')).toString()).toBe('');
  });

  it("leaves out filters and sorts the type doesn't use", () => {
    const state = parse('type=product&moqMax=5&priceMin=1&sort=price_desc&verified=false');
    const business = toSearchParams(withType(state, 'business'));
    expect(business.toString()).toBe('');
  });
});

describe('helpers', () => {
  it('offers only the sorts and filters the API applies', () => {
    expect(sortOptions('business').map((o) => o.value)).toEqual(['relevance', 'newest', 'rating']);
    expect(sortOptions('post').map((o) => o.value)).toEqual(['relevance', 'newest']);
    expect(filtersFor('product').has('moqMax')).toBe(true);
    expect(filtersFor('service').has('moqMax')).toBe(false);
    expect(filtersFor('business').has('ratingMin')).toBe(true);
  });

  it('counts and clears filters', () => {
    const state = parse(`type=product&city=${CITY}&verified=true&priceMin=1&q=x&sort=newest`);
    expect(activeFilterCount(state)).toBe(3);
    expect(clearFilters(state)).toEqual({ q: 'x', type: 'product', sort: 'relevance' });
  });

  it('builds links and API paths', () => {
    expect(searchHref({ q: 'steel bolts', type: 'product' })).toBe(
      '/search?q=steel+bolts&type=product',
    );
    expect(searchHref({})).toBe('/search');
    expect(searchApiPath(parse('q=a'), 'abc')).toBe('/v1/search?q=a&type=business&cursor=abc');
  });

  it('resets a sort the new tab lacks', () => {
    expect(withType(parse('type=product&sort=price_asc'), 'post').sort).toBe('relevance');
    expect(withType(parse('type=product&sort=newest'), 'post').sort).toBe('newest');
  });
});
