import {
  type CreateReviewInput,
  type MyReview,
  type Review,
  type ReviewsPage,
  type UpdateReviewInput,
  myReviewSchema,
  reviewSchema,
  reviewsPageSchema,
} from '@supporters/shared';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

/** Browser calls for business reviews. The API decides who may write, edit or reply. */
export const reviewsApi = {
  list: async (businessId: string, cursor?: string): Promise<ReviewsPage> =>
    reviewsPageSchema.parse(
      await api.request(
        `/v1/businesses/${businessId}/reviews${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
      ),
    ),
  mine: async (businessId: string): Promise<MyReview> =>
    myReviewSchema.parse(await api.request(`/v1/businesses/${businessId}/reviews/mine`)),
  create: async (businessId: string, body: CreateReviewInput): Promise<Review> =>
    reviewSchema.parse(
      await api.request(`/v1/businesses/${businessId}/reviews`, { method: 'POST', body }),
    ),
  update: async (id: string, body: UpdateReviewInput): Promise<Review> =>
    reviewSchema.parse(await api.request(`/v1/reviews/${id}`, { method: 'PATCH', body })),
  remove: (id: string) => api.request(`/v1/reviews/${id}`, { method: 'DELETE' }),
  reply: async (id: string, body: string): Promise<Review> =>
    reviewSchema.parse(
      await api.request(`/v1/reviews/${id}/reply`, { method: 'PUT', body: { body } }),
    ),
  removeReply: (id: string) => api.request(`/v1/reviews/${id}/reply`, { method: 'DELETE' }),
};

export const reviewKeys = {
  list: (businessId: string) => ['reviews', businessId, 'list'] as const,
  mine: (businessId: string) => ['reviews', businessId, 'mine'] as const,
};

export const reviewsQueryOptions = (businessId: string, initial?: ReviewsPage) =>
  infiniteQueryOptions({
    queryKey: reviewKeys.list(businessId),
    queryFn: ({ pageParam }) => reviewsApi.list(businessId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    ...(initial ? { initialData: { pages: [initial], pageParams: [undefined] } } : {}),
    staleTime: 30_000,
  });

export const myReviewQueryOptions = (businessId: string) =>
  queryOptions({
    queryKey: reviewKeys.mine(businessId),
    queryFn: () => reviewsApi.mine(businessId),
  });
