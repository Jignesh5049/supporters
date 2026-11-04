'use client';

import type { FeedItem, Page } from '@supporters/shared';
import {
  type InfiniteData,
  type QueryKey,
  infiniteQueryOptions,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { socialKeys } from './post-cache';
import { socialApi } from './social-api';

/** Server-rendered first pages are fresh for a minute before a background refetch. */
const LIST_STALE_MS = 60_000;

/** The server's first page as infinite-query data, so the client continues from its cursor. */
export function seedPages<T>(first: Page<T>): InfiniteData<Page<T>, string | undefined> {
  return { pages: [first], pageParams: [undefined] };
}

/** Items of every loaded page, once each (a feed page can repeat a post across stages). */
export function flattenPages<T extends { id: string }>(
  data: InfiniteData<Page<T>, unknown> | undefined,
): T[] {
  if (!data) return [];
  const seen = new Set<string>();
  const items: T[] = [];
  for (const page of data.pages) {
    for (const item of page.data) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      items.push(item);
    }
  }
  return items;
}

/**
 * Cursor pages for any `{ data, nextCursor }` list, seeded with the page the
 * server rendered.
 */
export function cursorListOptions<T>(
  queryKey: QueryKey,
  fetchPage: (cursor: string | undefined) => Promise<Page<T>>,
  initialPage?: Page<T>,
) {
  return infiniteQueryOptions({
    queryKey,
    queryFn: ({ pageParam }) => fetchPage(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: Page<T>) => last.nextCursor ?? undefined,
    initialData: initialPage ? seedPages(initialPage) : undefined,
    staleTime: LIST_STALE_MS,
  });
}

export const feedQueryOptions = (city: string | null, initialPage?: Page<FeedItem>) =>
  cursorListOptions(
    socialKeys.feed(city),
    (cursor) => socialApi.feed(cursor, city ?? undefined),
    initialPage,
  );

export function useFeed(city: string | null, initialPage: Page<FeedItem>) {
  return useInfiniteQuery(feedQueryOptions(city, initialPage));
}

/**
 * A sentinel element: when it scrolls near the viewport, `onReach` runs (the
 * next page loads). 600 px early so the list rarely visibly stops.
 */
export function useLoadMoreSentinel(onReach: () => void, isEnabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onReach);
  useEffect(() => {
    callback.current = onReach;
  }, [onReach]);
  useEffect(() => {
    const element = ref.current;
    if (!element || !isEnabled) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) callback.current();
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [isEnabled]);
  return ref;
}
