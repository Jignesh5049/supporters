import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import type { CreatePostInput, PostStatus, UpdatePostInput } from '@supporters/shared';
import { postsApi } from '../../../lib/api';
import { socialKeys } from '../../social/query-keys';
import { useViewerId } from '../../social/use-viewer';

/** The owner's posts in any status (GET /v1/me/business/posts), newest first. */
export function useMyPosts(status?: PostStatus) {
  const viewerId = useViewerId();
  return useInfiniteQuery({
    queryKey: [...socialKeys.myPosts(status), viewerId],
    queryFn: ({ pageParam }) => postsApi.listMine({ cursor: pageParam, status }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: viewerId !== null,
  });
}

/** A change to one post can move it between lists and change public pages and the feed. */
function refreshPostLists(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: socialKeys.posts });
  queryClient.invalidateQueries({ queryKey: ['feed'] });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePostInput) => postsApi.create(input),
    onSuccess: () => refreshPostLists(queryClient),
  });
}

export function useUpdatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdatePostInput & { id: string }) => postsApi.update(id, input),
    onSuccess: () => refreshPostLists(queryClient),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => postsApi.remove(id),
    onSuccess: () => refreshPostLists(queryClient),
  });
}
