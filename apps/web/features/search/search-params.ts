import {
  ProductAvailability,
  type SearchQuery,
  SearchSort,
  SearchType,
  ServiceAvailability,
  searchQuerySchema,
} from '@supporters/shared';
import { PRODUCT_AVAILABILITY_LABELS, SERVICE_AVAILABILITY_LABELS } from '@/lib/catalog/format';

/**
 * The search screen's state lives in the URL (`/search?q=&type=&...`), so a
 * result list can be shared, bookmarked and restored with Back. These helpers
 * turn the URL into an API query and back. Unknown or invalid params are
 * dropped one by one rather than failing the whole page.
 */
export type SearchState = Omit<SearchQuery, 'cursor' | 'limit'>;

export const SEARCH_PATH = '/search';

const FILTER_KEYS = [
  'category',
  'city',
  'state',
  'businessType',
  'verified',
  'priceMin',
  'priceMax',
  'availability',
  'moqMax',
  'ratingMin',
] as const satisfies (keyof SearchState)[];
export type FilterKey = (typeof FILTER_KEYS)[number];

const DEFAULTS = searchQuerySchema.parse({});

export const TYPE_TABS: { type: SearchType; label: string }[] = [
  { type: SearchType.Business, label: 'Businesses' },
  { type: SearchType.Product, label: 'Products' },
  { type: SearchType.Service, label: 'Services' },
  { type: SearchType.Post, label: 'Posts' },
];

const SORT_LABELS: Record<SearchSort, string> = {
  relevance: 'Relevance',
  newest: 'Newest',
  rating: 'Rating',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
};

/** Sorts the API applies for a type; others fall back to relevance, so they aren't offered. */
export function sortOptions(type: SearchType): { value: SearchSort; label: string }[] {
  const sorts: SearchSort[] = [SearchSort.Relevance, SearchSort.Newest];
  if (type === 'business') sorts.push(SearchSort.Rating);
  if (type === 'product' || type === 'service')
    sorts.push(SearchSort.PriceAsc, SearchSort.PriceDesc);
  return sorts.map((value) => ({ value, label: SORT_LABELS[value] }));
}

/** Which filters the API applies for a type (the rest are ignored, so they're hidden). */
export function filtersFor(type: SearchType): ReadonlySet<FilterKey> {
  const keys: FilterKey[] = ['category', 'state', 'city', 'businessType', 'verified'];
  if (type === 'business') keys.push('ratingMin');
  if (type === 'product' || type === 'service') keys.push('priceMin', 'priceMax', 'availability');
  if (type === 'product') keys.push('moqMax');
  return new Set(keys);
}

export function availabilityOptions(type: SearchType): { value: string; label: string }[] {
  if (type === 'product') {
    return Object.values(ProductAvailability).map((value) => ({
      value,
      label: PRODUCT_AVAILABILITY_LABELS[value],
    }));
  }
  if (type === 'service') {
    return Object.values(ServiceAvailability).map((value) => ({
      value,
      label: SERVICE_AVAILABILITY_LABELS[value],
    }));
  }
  return [];
}

/** Reads the URL, keeping each param that is valid on its own. */
export function parseSearchState(params: URLSearchParams): SearchState {
  const state: Record<string, unknown> = {};
  for (const key of ['q', 'type', 'sort', ...FILTER_KEYS] as const) {
    const value = params.get(key);
    if (value === null || value === '') continue;
    const parsed = searchQuerySchema.safeParse({ [key]: value });
    if (parsed.success) state[key] = parsed.data[key];
  }
  const merged: SearchState & Partial<Pick<SearchQuery, 'cursor' | 'limit'>> = {
    ...DEFAULTS,
    ...state,
  };
  delete merged.cursor;
  delete merged.limit;
  // A price range upside down drops the maximum, as the API would reject the pair.
  if (
    merged.priceMin !== undefined &&
    merged.priceMax !== undefined &&
    merged.priceMin > merged.priceMax
  ) {
    delete merged.priceMax;
  }
  return merged;
}

/** URL params for a state: defaults and filters that don't apply to the type are left out. */
export function toSearchParams(state: SearchState): URLSearchParams {
  const params = new URLSearchParams();
  if (state.q) params.set('q', state.q);
  if (state.type !== DEFAULTS.type) params.set('type', state.type);
  const applicable = filtersFor(state.type);
  for (const key of FILTER_KEYS) {
    const value = state[key];
    if (value === undefined || !applicable.has(key)) continue;
    if (key === 'verified' && value === false) continue;
    params.set(key, String(value));
  }
  const sorts = sortOptions(state.type).map((option) => option.value);
  if (state.sort !== DEFAULTS.sort && sorts.includes(state.sort)) params.set('sort', state.sort);
  return params;
}

export function searchHref(state: Partial<SearchState>): string {
  const params = toSearchParams({ ...DEFAULTS, ...state } as SearchState);
  return params.size > 0 ? `${SEARCH_PATH}?${params}` : SEARCH_PATH;
}

/** The API path for one page of results. */
export function searchApiPath(state: SearchState, cursor?: string): `/v1/${string}` {
  const params = toSearchParams(state);
  // The API's default type is business too, but an explicit type keeps cache keys obvious.
  params.set('type', state.type);
  if (cursor) params.set('cursor', cursor);
  return `/v1/search?${params}`;
}

/** Applied filters, for the "N filters" badge and "Clear all". */
export function activeFilterCount(state: SearchState): number {
  const applicable = filtersFor(state.type);
  return FILTER_KEYS.filter((key) => {
    const value = state[key];
    return applicable.has(key) && value !== undefined && value !== false;
  }).length;
}

/** Same text and type, every filter and the sort reset. */
export function clearFilters(state: SearchState): SearchState {
  return { q: state.q, type: state.type, sort: DEFAULTS.sort };
}

/** Switching tabs keeps text and filters; a sort the new type lacks resets to relevance. */
export function withType(state: SearchState, type: SearchType): SearchState {
  const sorts = sortOptions(type).map((option) => option.value);
  return { ...state, type, sort: sorts.includes(state.sort) ? state.sort : DEFAULTS.sort };
}
