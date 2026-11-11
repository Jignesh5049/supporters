import {
  DEFAULT_SEARCH,
  activeFilterCount,
  clearFilters,
  filtersFor,
  fromRouteParams,
  rupeesToPaise,
  sortOptions,
  toApiQuery,
  withFilter,
  withType,
} from './search-state';

const CITY = '0199f4a0-0000-7000-8000-000000000001';

describe('search state', () => {
  it('reads route params, keeping only valid ones', () => {
    expect(fromRouteParams({})).toEqual(DEFAULT_SEARCH);
    expect(
      fromRouteParams({
        q: 'bolts',
        type: 'product',
        state: 'mh',
        city: CITY,
        sort: 'nope',
        moqMax: 'x',
      }),
    ).toEqual({ q: 'bolts', type: 'product', sort: 'relevance', state: 'MH', city: CITY });
    expect(fromRouteParams({ category: ['fasteners', 'other'] })).toMatchObject({
      category: 'fasteners',
    });
  });

  it('offers only the sorts and filters the API applies to a tab', () => {
    expect(sortOptions('business').map((o) => o.value)).toEqual(['relevance', 'newest', 'rating']);
    expect(sortOptions('service').map((o) => o.value)).toContain('price_asc');
    expect(filtersFor('product').has('moqMax')).toBe(true);
    expect(filtersFor('post').has('priceMin')).toBe(false);
  });

  it('sends only applicable filters and drops verified=false', () => {
    const state = {
      ...DEFAULT_SEARCH,
      type: 'service' as const,
      moqMax: 5,
      priceMin: 100,
      verified: false,
      sort: 'rating' as const,
    };
    expect(toApiQuery(state)).toEqual({ q: '', type: 'service', sort: 'relevance', priceMin: 100 });
    expect(activeFilterCount(state)).toBe(1);
  });

  it('switches tabs, sets filters and clears them', () => {
    const product = { ...DEFAULT_SEARCH, type: 'product' as const, sort: 'price_asc' as const };
    expect(withType(product, 'post').sort).toBe('relevance');
    const withCity = withFilter(withFilter(product, 'state', 'MH'), 'city', CITY);
    expect(withCity.city).toBe(CITY);
    expect(withFilter(withCity, 'state', 'GJ')).not.toHaveProperty('city');
    expect(withFilter(withCity, 'city', undefined)).not.toHaveProperty('city');
    expect(clearFilters({ ...withCity, q: 'x' })).toEqual({
      q: 'x',
      type: 'product',
      sort: 'relevance',
    });
  });

  it('converts rupees to paise', () => {
    expect(rupeesToPaise('1,499.5')).toBe(149_950);
    expect(rupeesToPaise('20')).toBe(2_000);
    expect(rupeesToPaise('abc')).toBeNull();
  });
});
