import { useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { socialApi } from '../../../lib/api';
import { SessionStatus, useSessionStore } from '../../../stores/session-store';
import { socialKeys } from '../../social/query-keys';
import { useViewerId } from '../../social/use-viewer';
import { createSeenBatcher } from '../seen-batcher';

/**
 * The home feed (product spec, Feed and social): signed-in users get their own
 * feed, guests the newest posts in `city` (All India without one). 20 per page.
 */
export function useFeed(city?: string) {
  const viewerId = useViewerId();
  const isRestoring = useSessionStore((state) => state.status === SessionStatus.Restoring);
  const guestCity = viewerId ? undefined : city;

  return useInfiniteQuery({
    queryKey: [...socialKeys.feed(viewerId ?? 'guest'), guestCity ?? 'all-india'],
    queryFn: ({ pageParam }) => socialApi.feed({ cursor: pageParam, city: guestCity }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    // Wait for the stored session, so a signed-in user never gets the guest feed first.
    enabled: !isRestoring,
  });
}

/** Reports posts shown on screen. A no-op for guests, whose feed has no seen list. */
export function useMarkFeedSeen(): (postIds: string[]) => void {
  const viewerId = useViewerId();
  const batcher = useMemo(
    () => (viewerId ? createSeenBatcher((ids) => socialApi.markSeen(ids)) : null),
    [viewerId],
  );

  useEffect(
    () => () => {
      batcher?.flush();
      batcher?.dispose();
    },
    [batcher],
  );

  return useMemo(() => (postIds: string[]) => batcher?.add(postIds), [batcher]);
}
