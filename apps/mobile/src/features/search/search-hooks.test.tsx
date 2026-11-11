import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { SearchHit, SearchResponse } from '@supporters/shared';
import { SessionStatus, useSessionStore } from '../../stores/session-store';
import { availabilityLabel, listingPriceLabel } from './labels';
import { flattenHits, hitId, useDiscover, useSearchResults, useSuggestions } from './hooks';
import { DEFAULT_SEARCH } from './search-state';

const mockSearchApi = { search: jest.fn(), suggest: jest.fn(), discover: jest.fn() };
jest.mock('../../lib/api', () => ({
  get searchApi() {
    return mockSearchApi;
  },
}));

let client: QueryClient;
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } });
  useSessionStore.getState().setGuest();
});

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const business = {
  id: uuid(900),
  slug: 'asha',
  name: 'Asha',
  logo: null,
  city: { id: uuid(901), name: 'Pune', stateCode: 'MH' },
  isVerified: false,
  isPremium: false,
};
const listing = (n: number, overrides: object = {}) => ({
  id: uuid(n),
  kind: 'product' as const,
  business,
  title: `Bolts ${n}`,
  category: { id: uuid(902), name: 'Fasteners', slug: 'fasteners', parentId: null },
  price: null,
  priceUnit: null,
  image: null,
  availability: 'in_stock' as const,
  moq: null,
  publishedAt: null,
  ...overrides,
});
const hit = (n: number): SearchHit => ({ type: 'product', listing: listing(n) });
const page = (ns: number[], nextCursor: string | null): SearchResponse => ({
  data: ns.map(hit),
  nextCursor,
  estimatedTotal: 3,
});

describe('useSearchResults', () => {
  it('sends the applicable query and pages on the cursor', async () => {
    mockSearchApi.search
      .mockResolvedValueOnce(page([1, 2], 'next'))
      .mockResolvedValueOnce(page([2, 3], null));
    const state = { ...DEFAULT_SEARCH, q: 'bolts', type: 'product' as const, ratingMin: 4 };
    const { result } = await renderHook(() => useSearchResults(state), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSearchApi.search).toHaveBeenCalledWith({
      q: 'bolts',
      type: 'product',
      sort: 'relevance',
    });
    await act(() => result.current.fetchNextPage());
    expect(mockSearchApi.search).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: 'next' }),
    );
    expect(flattenHits([page([1, 2], 'next'), page([2, 3], null)]).map(hitId)).toEqual([
      uuid(1),
      uuid(2),
      uuid(3),
    ]);
  });
});

describe('useSuggestions', () => {
  it('waits for two characters', async () => {
    mockSearchApi.suggest.mockResolvedValue([
      { type: 'business', id: uuid(1), label: 'Asha', slug: 'asha' },
    ]);
    const { result, rerender } = await renderHook(
      ({ text }: { text: string }) => useSuggestions(text),
      {
        wrapper,
        initialProps: { text: 'a' },
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(mockSearchApi.suggest).not.toHaveBeenCalled();
    await rerender({ text: ' as ' });
    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(mockSearchApi.suggest).toHaveBeenCalledWith('as');
  });
});

describe('useDiscover', () => {
  it('passes the guest city, and none for a signed-in user', async () => {
    const empty = { trending: [], featured: [], nearYou: { city: null, data: [] }, suggested: [] };
    mockSearchApi.discover.mockResolvedValue(empty);
    const guest = await renderHook(() => useDiscover(uuid(5)), { wrapper });
    await waitFor(() => expect(guest.result.current.isSuccess).toBe(true));
    expect(mockSearchApi.discover).toHaveBeenLastCalledWith(uuid(5));

    useSessionStore.getState().setSignedIn({ id: uuid(7) } as never);
    const user = await renderHook(() => useDiscover(uuid(5)), { wrapper });
    await waitFor(() => expect(user.result.current.isSuccess).toBe(true));
    expect(mockSearchApi.discover).toHaveBeenLastCalledWith(undefined);
  });
});

describe('result labels', () => {
  it('formats prices and availability', () => {
    expect(listingPriceLabel(listing(1))).toBe('Ask for price');
    const kg = listing(1, { price: { amountPaise: 45_000, currency: 'INR' }, priceUnit: 'kg' });
    expect(listingPriceLabel(kg)).toBe('₹450 / kg');
    const job = listing(1, {
      kind: 'service',
      price: { amountPaise: 200_000, currency: 'INR' },
      priceUnit: 'per_job',
    });
    expect(listingPriceLabel(job)).toBe('₹2,000 per job');
    expect(availabilityLabel(listing(1))).toBe('In stock');
    expect(availabilityLabel(listing(1, { kind: 'service', availability: 'immediate' }))).toBe(
      'Available now',
    );
  });
});
