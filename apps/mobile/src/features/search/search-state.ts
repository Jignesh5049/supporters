import {
  ProductAvailability,
  type SearchQuery,
  SearchSort,
  SearchType,
  ServiceAvailability,
  searchQuerySchema,
} from '@supporters/shared';
import { productAvailabilityLabel, serviceAvailabilityLabel } from '../catalog/labels';

/** What the search screen holds: the API query without paging. */
export type SearchState = Omit<SearchQuery, 'cursor' | 'limit'>;

export type FilterKey = Exclude<keyof SearchState, 'q' | 'type' | 'sort'>;

export const DEFAULT_SEARCH: SearchState = { q: '', type: SearchType.Business, sort: 'relevance' };

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

/** Sorts the API applies to a type; the others fall back to relevance, so they aren't offered. */
export function sortOptions(type: SearchType): { value: SearchSort; label: string }[] {
  const sorts: SearchSort[] = [SearchSort.Relevance, SearchSort.Newest];
  if (type === 'business') sorts.push(SearchSort.Rating);
  if (type === 'product' || type === 'service')
    sorts.push(SearchSort.PriceAsc, SearchSort.PriceDesc);
  return sorts.map((value) => ({ value, label: SORT_LABELS[value] }));
}

/** Filters the API applies to a type (the rest are ignored, so they're hidden). */
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
      label: productAvailabilityLabel(value),
    }));
  }
  if (type === 'service') {
    return Object.values(ServiceAvailability).map((value) => ({
      value,
      label: serviceAvailabilityLabel(value),
    }));
  }
  return [];
}

const FILTER_KEYS: FilterKey[] = [
  'category',
  'state',
  'city',
  'businessType',
  'verified',
  'priceMin',
  'priceMax',
  'availability',
  'moqMax',
  'ratingMin',
];

/** The query sent to the API: filters and sorts the type doesn't use are dropped. */
export function toApiQuery(state: SearchState): SearchState {
  const applicable = filtersFor(state.type);
  const query: SearchState = { q: state.q, type: state.type, sort: state.sort };
  for (const key of FILTER_KEYS) {
    const value = state[key];
    if (value === undefined || value === false || !applicable.has(key)) continue;
    Object.assign(query, { [key]: value });
  }
  const sorts = sortOptions(state.type).map((option) => option.value);
  if (!sorts.includes(query.sort)) query.sort = 'relevance';
  return query;
}

export function activeFilterCount(state: SearchState): number {
  const query = toApiQuery(state);
  return FILTER_KEYS.filter((key) => query[key] !== undefined).length;
}

/** Same text and type, filters and sort reset. */
export const clearFilters = (state: SearchState): SearchState => ({
  q: state.q,
  type: state.type,
  sort: 'relevance',
});

/** Switching tabs keeps text and filters; a sort the new tab lacks resets to relevance. */
export function withType(state: SearchState, type: SearchType): SearchState {
  const sorts = sortOptions(type).map((option) => option.value);
  return { ...state, type, sort: sorts.includes(state.sort) ? state.sort : 'relevance' };
}

/** Sets or clears one filter; a new state clears the city, which belongs to one state. */
export function withFilter<K extends FilterKey>(
  state: SearchState,
  key: K,
  value: SearchState[K] | undefined,
): SearchState {
  const next: SearchState = { ...state, [key]: value };
  if (value === undefined) delete next[key];
  if (key === 'state') delete next.city;
  return next;
}

/** Route params (`/search?q=&type=&category=`), each kept only if valid. */
export function fromRouteParams(
  params: Record<string, string | string[] | undefined>,
): SearchState {
  const state: SearchState = { ...DEFAULT_SEARCH };
  for (const key of ['q', 'type', 'sort', ...FILTER_KEYS] as const) {
    const raw = params[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (!value) continue;
    const parsed = searchQuerySchema.safeParse({ [key]: value });
    if (parsed.success) Object.assign(state, { [key]: parsed.data[key] });
  }
  return state;
}

/** Rupees typed into the price filter (`"1,499.5"`) to paise, or null when it isn't a price. */
export function rupeesToPaise(input: string): number | null {
  const cleaned = input.replace(/[,\s₹]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole = '0', fraction = ''] = cleaned.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
