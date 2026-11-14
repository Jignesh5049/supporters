import {
  createReviewSchema,
  myReviewSchema,
  reviewReplySchema,
  reviewSchema,
  reviewsPageSchema,
  updateReviewSchema,
  type CreateReviewInput,
  type MyReview,
  type Review,
  type ReviewsPage,
  type UpdateReviewInput,
} from '@supporters/shared';
import type { ApiClient } from './client';
import { seg, toQueryString } from './query-string';

export interface ReviewsApi {
  list(businessId: string, query?: { cursor?: string }): Promise<ReviewsPage>;
  mine(businessId: string): Promise<MyReview>;
  create(businessId: string, data: CreateReviewInput): Promise<Review>;
  update(id: string, data: UpdateReviewInput): Promise<Review>;
  remove(id: string): Promise<void>;
  reply(id: string, body: string): Promise<Review>;
  removeReply(id: string): Promise<void>;
}

export function createReviewsApi(client: ApiClient): ReviewsApi {
  return {
    list: (businessId, query = {}) =>
      client.request(`/businesses/${seg(businessId)}/reviews${toQueryString({ ...query })}`, {
        schema: reviewsPageSchema,
      }),
    mine: (businessId) =>
      client.request(`/businesses/${seg(businessId)}/reviews/mine`, { schema: myReviewSchema }),
    create: (businessId, data) =>
      client.request(`/businesses/${seg(businessId)}/reviews`, {
        method: 'POST',
        body: createReviewSchema.parse(data),
        schema: reviewSchema,
      }),
    update: (id, data) =>
      client.request(`/reviews/${seg(id)}`, {
        method: 'PATCH',
        body: updateReviewSchema.parse(data),
        schema: reviewSchema,
      }),
    remove: (id) => client.request(`/reviews/${seg(id)}`, { method: 'DELETE' }),
    reply: (id, body) =>
      client.request(`/reviews/${seg(id)}/reply`, {
        method: 'PUT',
        body: reviewReplySchema.parse({ body }),
        schema: reviewSchema,
      }),
    removeReply: (id) => client.request(`/reviews/${seg(id)}/reply`, { method: 'DELETE' }),
  };
}
