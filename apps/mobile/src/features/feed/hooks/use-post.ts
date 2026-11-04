import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { postsApi } from '../../../lib/api';
import { socialKeys } from '../../social/query-keys';
import { useViewerId } from '../../social/use-viewer';

/** One published post. Signed in, it carries the viewer's own like and save. */
export function usePost(id: string) {
  const viewerId = useViewerId();
  return useQuery({
    // The viewer is in the key so isLiked/isSaved never leak across accounts.
    queryKey: [...socialKeys.post(id), viewerId ?? 'guest'],
    queryFn: () => postsApi.get(id),
    enabled: Boolean(id),
  });
}

/** A business page's Posts tab, newest first. */
export function useBusinessPosts(businessId: string | undefined) {
  const viewerId = useViewerId();
  return useInfiniteQuery({
    queryKey: [...socialKeys.businessPosts(businessId ?? ''), viewerId ?? 'guest'],
    queryFn: ({ pageParam }) => postsApi.listByBusiness(businessId ?? '', { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(businessId),
  });
}
