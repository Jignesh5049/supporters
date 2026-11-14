import {
  createReviewSchema,
  REVIEW_LIMITS,
  TEXT_LIMITS,
  type BusinessRating,
  type CreateReviewInput,
  type ReviewEligibility,
} from '@supporters/shared';
import { ApiError, messageForError } from '../../lib/api';

// Pure helpers for the Reviews tab, tested without React Native.

export const REVIEW_TEXT = TEXT_LIMITS.review;

/** `4.3` and the count, or `New` below 3 reviews (product spec, Rating shown). */
export function ratingText(rating: BusinessRating | undefined): { value: string; count: string } {
  const count = rating?.count ?? 0;
  const countText = `${count} ${count === 1 ? 'review' : 'reviews'}`;
  if (!rating || rating.average === null) return { value: 'New', count: countText };
  return { value: rating.average.toFixed(1), count: countText };
}

export function toReviewInput(values: {
  rating: number;
  body: string;
}):
  | { ok: true; input: CreateReviewInput }
  | { ok: false; errors: Partial<Record<'rating' | 'body', string>> } {
  const parsed = createReviewSchema.safeParse(values);
  if (parsed.success) return { ok: true, input: parsed.data };
  const errors: Partial<Record<'rating' | 'body', string>> = {};
  for (const issue of parsed.error.issues) {
    if (issue.path[0] === 'rating') errors.rating = 'Choose 1 to 5 stars.';
    if (issue.path[0] === 'body') {
      errors.body = `Write between ${REVIEW_TEXT.min} and ${REVIEW_TEXT.max.toLocaleString('en-IN')} characters.`;
    }
  }
  return { ok: false, errors };
}

/** Why the viewer can't write a review, or null when they can. */
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
    if (error.code === 'REVIEW_EXISTS') {
      return 'You have already reviewed this business. Edit your review instead.';
    }
    if (error.code === 'REVIEW_NOT_ELIGIBLE') {
      return 'Reviews open 24 hours after your first chat or enquiry with the business.';
    }
    if (error.code === 'BLOCKED') return 'You can’t review this business.';
  }
  return messageForError(error);
}
