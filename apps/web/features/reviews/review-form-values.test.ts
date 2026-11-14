import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import {
  eligibilityText,
  ratingText,
  reviewErrorMessage,
  toReviewBody,
} from './review-form-values';

describe('ratingText', () => {
  it('shows "New" below 3 reviews, then the average to one decimal', () => {
    expect(ratingText(undefined)).toEqual({ value: 'New', count: '0 reviews' });
    expect(ratingText({ average: null, count: 1 })).toEqual({ value: 'New', count: '1 review' });
    expect(ratingText({ average: 4, count: 12 })).toEqual({ value: '4.0', count: '12 reviews' });
  });
});

describe('toReviewBody', () => {
  it('needs stars and 20 to 1,000 characters', () => {
    expect(toReviewBody({ rating: 5, body: '  Great service and on-time delivery.  ' })).toEqual({
      ok: true,
      body: { rating: 5, body: 'Great service and on-time delivery.' },
    });
    expect(toReviewBody({ rating: 0, body: 'short' })).toEqual({
      ok: false,
      errors: { rating: 'Choose 1 to 5 stars.', body: 'Write between 20 and 1,000 characters.' },
    });
  });
});

describe('eligibilityText', () => {
  it('explains why a review cannot be written yet', () => {
    const now = new Date('2026-11-07T10:00:00.000Z');
    expect(eligibilityText('eligible', null, now)).toBeNull();
    expect(eligibilityText('reviewed', null, now)).toBeNull();
    expect(eligibilityText('own_business', null, now)).toMatch(/your own business/);
    expect(eligibilityText('no_thread', null, now)).toMatch(/24 hours later/);
    expect(eligibilityText('too_soon', '2026-11-07T15:30:00.000Z', now)).toBe(
      'You can review this business in about 6 hours.',
    );
  });
});

describe('reviewErrorMessage', () => {
  it('uses the API detail for eligibility', () => {
    const error = new ApiError({
      status: 403,
      code: 'REVIEW_NOT_ELIGIBLE',
      title: 'x',
      detail: 'Reviews open 24 hours after your first chat.',
    });
    expect(reviewErrorMessage(error)).toBe('Reviews open 24 hours after your first chat.');
    expect(
      reviewErrorMessage(new ApiError({ status: 409, code: 'REVIEW_EXISTS', title: 'x' })),
    ).toMatch(/already reviewed/);
  });
});
