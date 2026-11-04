import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import type { Business, BusinessSummary, FollowingItem, Page } from '@supporters/shared';
import { socialApi } from '../../../lib/api';
import { businessKeys } from '../../business/hooks/useBusinessQuery';
import { socialKeys } from '../query-keys';
import { useViewerId } from '../use-viewer';

type FollowingPages = InfiniteData<Page<FollowingItem>, string | undefined>;

/** The businesses the signed-in user follows (`/me/following`). */
export function useFollowing() {
  const viewerId = useViewerId();
  return useInfiniteQuery({
    queryKey: [...socialKeys.following, viewerId],
    queryFn: ({ pageParam }) => socialApi.following({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: viewerId !== null,
  });
}

/** Business ids from the loaded pages of the following list. */
export function followedIds(
  data: InfiniteData<Page<FollowingItem>, unknown> | undefined,
): Set<string> {
  return new Set(data?.pages.flatMap((page) => page.data.map((item) => item.business.id)));
}

export function useFollowers(businessId: string, enabled = true) {
  return useInfiniteQuery({
    queryKey: socialKeys.followers(businessId),
    queryFn: ({ pageParam }) => socialApi.followers(businessId, { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(businessId) && enabled,
  });
}

export interface FollowInput {
  businessId: string;
  isFollowing: boolean;
  /** Lets the following list show a new follow before the server answers. */
  summary?: BusinessSummary;
}

/**
 * Follow or unfollow a business. The follower count on cached business pages
 * moves at once and goes back if the API refuses; the server's count wins.
 */
export function useToggleFollow() {
  const queryClient = useQueryClient();

  const setCount = (businessId: string, update: (count: number) => number) =>
    queryClient.setQueriesData<Business>({ queryKey: businessKeys.all }, (data) =>
      data && data.id === businessId
        ? { ...data, followerCount: Math.max(0, update(data.followerCount)) }
        : data,
    );

  return useMutation({
    mutationFn: ({ businessId, isFollowing }: FollowInput) =>
      socialApi.setFollowing(businessId, isFollowing),
    onMutate: async ({ businessId, isFollowing, summary }) => {
      await queryClient.cancelQueries({ queryKey: businessKeys.all });
      await queryClient.cancelQueries({ queryKey: socialKeys.following });
      const previousFollowing = queryClient.getQueriesData<FollowingPages>({
        queryKey: socialKeys.following,
      });
      queryClient.setQueriesData<FollowingPages>({ queryKey: socialKeys.following }, (data) => {
        if (!data) return data;
        const pages = data.pages.map((page, i) => ({
          ...page,
          data: [
            ...(isFollowing && summary && i === 0
              ? [{ business: summary, followedAt: new Date().toISOString() }]
              : []),
            ...page.data.filter((item) => isFollowing || item.business.id !== businessId),
          ],
        }));
        return { ...data, pages };
      });
      const before = queryClient
        .getQueriesData<Business>({ queryKey: businessKeys.all })
        .map(([, data]) => data)
        .find((data) => data?.id === businessId);
      setCount(businessId, (count) => count + (isFollowing ? 1 : -1));
      return { count: before?.followerCount, previousFollowing };
    },
    onError: (_error, { businessId }, context) => {
      const count = context?.count;
      if (count !== undefined) setCount(businessId, () => count);
      for (const [key, data] of context?.previousFollowing ?? [])
        queryClient.setQueryData(key, data);
    },
    onSuccess: (state, { businessId }) => {
      setCount(businessId, () => state.followerCount);
    },
    onSettled: () => {
      // The following list (and the follow button state) comes from the server.
      queryClient.invalidateQueries({ queryKey: socialKeys.following });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
