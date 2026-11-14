import {
  type BusinessRating,
  type CreateReviewInput,
  REVIEW_LIMITS,
  type ReviewEligibility,
  createReviewSchema,
} from '@supporters/shared';
import { ApiError, errorMessage } from '@/lib/api/errors';

// Pure helpers for the Reviews tab, tested without React.

/** `4.3` with the count, or `New` below 3 reviews (product spec, Rating shown). */
export function ratingText(rating: BusinessRating | undefined): { value: string; count: string } {
  const count = rating?.count ?? 0;
  const countText = `${count} ${count === 1 ? 'review' : 'reviews'}`;
  if (!rating || rating.average === null) return { value: 'New', count: countText };
  return { value: rating.average.toFixed(1), count: countText };
}

export interface ReviewFormValues {
  rating: number;
  body: string;
}

export type ReviewErrors = Partial<Record<keyof ReviewFormValues, string>>;

export function toReviewBody(
  values: ReviewFormValues,
): { ok: true; body: CreateReviewInput } | { ok: false; errors: ReviewErrors } {
  const parsed = createReviewSchema.safeParse(values);
  if (parsed.success) return { ok: true, body: parsed.data };
  const errors: ReviewErrors = {};
  for (const issue of parsed.error.issues) {
    if (issue.path[0] === 'rating') errors.rating = 'Choose 1 to 5 stars.';
    if (issue.path[0] === 'body') errors.body = 'Write between 20 and 1,000 characters.';
  }
  return { ok: false, errors };
}

/** Why the viewer can't write a review, in words; null when they can. */
export function eligibilityText(
  eligibility: ReviewEligibility,
  eligibleAt: string | null,
  now: Date = new Date(),
): string | null {
  switch (eligibility) {
    case 'eligible':
    case 'reviewed':
      return null;
    case 'own_business':
      return 'You can’t review your own business.';
    case 'blocked':
      return 'You can’t review this business.';
    case 'no_thread':
      return `Chat with or send an enquiry to this business first. You can review it ${REVIEW_LIMITS.eligibleAfterHours} hours later.`;
    case 'too_soon': {
      if (!eligibleAt) return 'You can review this business soon.';
      const hours = Math.max(1, Math.ceil((Date.parse(eligibleAt) - now.getTime()) / 3_600_000));
      return `You can review this business in about ${hours} ${hours === 1 ? 'hour' : 'hours'}.`;
    }
  }
}

export function reviewErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'REVIEW_EXISTS':
        return 'You have already reviewed this business. Edit your review instead.';
      case 'REVIEW_NOT_ELIGIBLE':
        return error.detail ?? 'You can’t review this business yet.';
      case 'BLOCKED':
        return 'You can’t review this business.';
      default:
        break;
    }
  }
  return errorMessage(error);
}
