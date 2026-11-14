import { z } from 'zod';
import { TEXT_LIMITS } from '../limits';
import { businessRatingSchema } from './business';
import { paginationQuerySchema } from './common';
import { userRefSchema } from './social';

// Reviews and ratings (product spec, Reviews and ratings): businesses only.

const reviewBodySchema = z.string().trim().min(TEXT_LIMITS.review.min).max(TEXT_LIMITS.review.max);
const starsSchema = z.number().int().min(1).max(5);

export const createReviewSchema = z.strictObject({
  rating: starsSchema,
  body: reviewBodySchema,
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

/** The author edits the stars, the text, or both. */
export const updateReviewSchema = z
  .strictObject({ rating: starsSchema.optional(), body: reviewBodySchema.optional() })
  .refine((input) => input.rating !== undefined || input.body !== undefined, {
    message: 'Change the rating or the text',
  });
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

/** The owner's one public reply; sending it again edits it. */
export const reviewReplySchema = z.strictObject({
  body: z.string().trim().min(1).max(TEXT_LIMITS.reviewReply.max),
});
export type ReviewReplyInput = z.infer<typeof reviewReplySchema>;

export const reviewIdParamsSchema = z.strictObject({ id: z.uuid() });

export const reviewSchema = z.object({
  id: z.uuid(),
  businessId: z.uuid(),
  rating: starsSchema,
  body: z.string(),
  author: userRefSchema,
  ownerReply: z.object({ body: z.string(), repliedAt: z.iso.datetime() }).nullable(),
  /** The signed-in viewer wrote it. */
  isMine: z.boolean(),
  /** Hidden by moderation; only its author still sees it. */
  isHidden: z.boolean(),
  createdAt: z.iso.datetime(),
  /** Later than createdAt once the author edited it. */
  updatedAt: z.iso.datetime(),
});
export type Review = z.infer<typeof reviewSchema>;

export const reviewsQuerySchema = paginationQuerySchema;

export const reviewsPageSchema = z.object({
  data: z.array(reviewSchema),
  nextCursor: z.string().nullable(),
  rating: businessRatingSchema,
});
export type ReviewsPage = z.infer<typeof reviewsPageSchema>;

/** Why the signed-in user can or cannot review a business. */
export const ReviewEligibility = {
  Eligible: 'eligible',
  /** Already reviewed: edit that one instead. */
  Reviewed: 'reviewed',
  OwnBusiness: 'own_business',
  /** No chat or enquiry thread with the business yet. */
  NoThread: 'no_thread',
  /** The thread is younger than 24 hours; see `eligibleAt`. */
  TooSoon: 'too_soon',
  Blocked: 'blocked',
} as const;
export type ReviewEligibility = (typeof ReviewEligibility)[keyof typeof ReviewEligibility];

export const myReviewSchema = z.object({
  review: reviewSchema.nullable(),
  eligibility: z.enum(ReviewEligibility),
  /** When the thread turns 24 hours old, for `too_soon`. */
  eligibleAt: z.iso.datetime().nullable(),
});
export type MyReview = z.infer<typeof myReviewSchema>;
