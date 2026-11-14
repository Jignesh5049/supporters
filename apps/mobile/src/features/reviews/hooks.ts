import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateReviewInput } from '@supporters/shared';
import { reviewsApi } from '../../lib/api';
import { businessKeys } from '../business/hooks';
import { useViewerId } from '../social/use-viewer';

export const reviewKeys = {
  all: (businessId: string) => ['reviews', businessId] as const,
  list: (businessId: string, viewer: string) => ['reviews', businessId, 'list', viewer] as const,
  mine: (businessId: string, viewer: string) => ['reviews', businessId, 'mine', viewer] as const,
};

/** A business's visible reviews, newest first, with its rating. Public. */
export function useBusinessReviews(businessId: string) {
  const viewerId = useViewerId();
  return useInfiniteQuery({
    queryKey: reviewKeys.list(businessId, viewerId ?? 'guest'),
    queryFn: ({ pageParam }) => reviewsApi.list(businessId, { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: businessId !== '',
  });
}

/** The viewer's review and whether they may write one. Signed in only. */
export function useMyReview(businessId: string, enabled: boolean) {
  const viewerId = useViewerId();
  return useQuery({
    queryKey: reviewKeys.mine(businessId, viewerId ?? 'guest'),
    queryFn: () => reviewsApi.mine(businessId),
    enabled: enabled && viewerId !== null && businessId !== '',
  });
}

/** Write, edit or delete a review, or the owner's reply; then refresh the tab and the rating. */
export function useReviewMutations(businessId: string) {
  const queryClient = useQueryClient();
  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: reviewKeys.all(businessId) });
    // The hero shows the rating from the business query.
    void queryClient.invalidateQueries({ queryKey: businessKeys.all });
  };
  return {
    save: useMutation({
      mutationFn: ({ reviewId, input }: { reviewId: string | null; input: CreateReviewInput }) =>
        reviewId ? reviewsApi.update(reviewId, input) : reviewsApi.create(businessId, input),
      onSuccess: refresh,
    }),
    remove: useMutation({ mutationFn: (id: string) => reviewsApi.remove(id), onSuccess: refresh }),
    reply: useMutation({
      mutationFn: ({ id, body }: { id: string; body: string }) => reviewsApi.reply(id, body),
      onSuccess: refresh,
    }),
    removeReply: useMutation({
      mutationFn: (id: string) => reviewsApi.removeReply(id),
      onSuccess: refresh,
    }),
  };
}
