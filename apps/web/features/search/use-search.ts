'use client';

import { SEARCH_LIMITS, type SearchHit } from '@supporters/shared';
import {
  type InfiniteData,
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { SearchResponse } from '@supporters/shared';
import { searchApi, searchKeys } from './search-api';
import type { SearchState } from './search-params';

/** Autocomplete waits this long after the last keystroke (and the API limits 60 a minute). */
export const SUGGEST_DEBOUNCE_MS = 250;

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Search results on the cursor, kept on screen while the next query loads. */
export function useSearchResults(state: SearchState) {
  return useInfiniteQuery({
    queryKey: searchKeys.results(state),
    queryFn: ({ pageParam, signal }) => searchApi.search(state, pageParam, signal),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: SearchResponse) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

/** A hit's own id (the card's id), for keys and de-duplication across pages. */
export const hitId = (hit: SearchHit): string =>
  hit.type === 'business' ? hit.business.id : hit.type === 'post' ? hit.post.id : hit.listing.id;

/** Every loaded hit once (offset pages can repeat one if the index changed in between). */
export function flattenHits(data: InfiniteData<SearchResponse, unknown> | undefined): SearchHit[] {
  if (!data) return [];
  const seen = new Set<string>();
  return data.pages.flatMap((page) =>
    page.data.filter((hit) => {
      const id = hitId(hit);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }),
  );
}

/** Suggestions for the trimmed text, from 2 characters, debounced. */
export function useSuggestions(text: string) {
  const q = useDebouncedValue(text.trim(), SUGGEST_DEBOUNCE_MS);
  const isEnabled = q.length >= SEARCH_LIMITS.suggestMinChars;
  return useQuery({
    queryKey: searchKeys.suggest(q),
    queryFn: ({ signal }) => searchApi.suggest(q, signal),
    enabled: isEnabled,
    staleTime: 60_000,
    select: (data) => (isEnabled ? data : []),
  });
}

export function useCities(stateCode: string | undefined) {
  return useQuery({
    queryKey: searchKeys.cities(stateCode ?? ''),
    queryFn: () => searchApi.cities(stateCode ?? ''),
    enabled: Boolean(stateCode),
    staleTime: 60 * 60_000,
  });
}

/** Up/Down move through suggestions (wrapping, -1 = the input itself). */
export function nextActiveIndex(current: number, key: 'ArrowDown' | 'ArrowUp', count: number) {
  if (count === 0) return -1;
  if (key === 'ArrowDown') return current + 1 >= count ? -1 : current + 1;
  return current <= -1 ? count - 1 : current - 1;
}
