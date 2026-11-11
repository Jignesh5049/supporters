import { useEffect, useState } from 'react';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { SEARCH_LIMITS, type SearchHit, type SearchResponse } from '@supporters/shared';
import { searchApi } from '../../lib/api';
import { SessionStatus, useSessionStore } from '../../stores/session-store';
import { useViewerId } from '../social/use-viewer';
import { type SearchState, toApiQuery } from './search-state';

/** Autocomplete waits this long after the last keystroke (the API allows 60 a minute). */
export const SUGGEST_DEBOUNCE_MS = 300;

export const searchKeys = {
  all: ['search'] as const,
  results: (state: SearchState) => [...searchKeys.all, 'results', state] as const,
  suggest: (q: string) => [...searchKeys.all, 'suggest', q] as const,
  discover: (viewer: string, city: string | null) =>
    [...searchKeys.all, 'discover', viewer, city ?? 'none'] as const,
};

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** Results on the cursor; the previous list stays on screen while a new filter loads. */
export function useSearchResults(state: SearchState) {
  const query = toApiQuery(state);
  return useInfiniteQuery({
    queryKey: searchKeys.results(query),
    queryFn: ({ pageParam }) => searchApi.search({ ...query, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: SearchResponse) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export const hitId = (hit: SearchHit): string =>
  hit.type === 'business' ? hit.business.id : hit.type === 'post' ? hit.post.id : hit.listing.id;

/** Every loaded hit once (offset pages can repeat one if the index changed in between). */
export function flattenHits(pages: SearchResponse[] | undefined): SearchHit[] {
  const seen = new Set<string>();
  return (pages ?? []).flatMap((page) =>
    page.data.filter((hit) => {
      const id = hitId(hit);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    }),
  );
}

/** Suggestions for the trimmed text from 2 characters, debounced. */
export function useSuggestions(text: string) {
  const q = useDebouncedValue(text.trim(), SUGGEST_DEBOUNCE_MS);
  const isEnabled = q.length >= SEARCH_LIMITS.suggestMinChars;
  const query = useQuery({
    queryKey: searchKeys.suggest(q),
    queryFn: () => searchApi.suggest(q),
    enabled: isEnabled,
    staleTime: 60_000,
  });
  return isEnabled ? (query.data ?? []) : [];
}

/** The Discover sections, per viewer (a guest passes their chosen city). */
export function useDiscover(city: string | null) {
  const viewerId = useViewerId();
  const isRestoring = useSessionStore((state) => state.status === SessionStatus.Restoring);
  return useQuery({
    queryKey: searchKeys.discover(viewerId ?? 'guest', viewerId ? null : city),
    queryFn: () => searchApi.discover(viewerId ? undefined : (city ?? undefined)),
    // Wait for the stored session, so a signed-in user never gets the guest sections first.
    enabled: !isRestoring,
    staleTime: 60_000,
  });
}
