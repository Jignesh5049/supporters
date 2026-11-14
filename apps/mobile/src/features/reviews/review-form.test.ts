import { ApiError } from '../../lib/api/errors';
import { eligibilityText, ratingText, reviewErrorMessage, toReviewInput } from './review-form';

describe('ratingText', () => {
  it('shows New below 3 reviews, then the average to one decimal', () => {
    expect(ratingText(undefined)).toEqual({ value: 'New', count: '0 reviews' });
    expect(ratingText({ average: null, count: 1 })).toEqual({ value: 'New', count: '1 review' });
    expect(ratingText({ average: 4, count: 12 })).toEqual({ value: '4.0', count: '12 reviews' });
  });
});

describe('toReviewInput', () => {
  it('needs stars and 20 to 1,000 characters', () => {
    expect(toReviewInput({ rating: 5, body: '  Great service and on-time delivery.  ' })).toEqual({
      ok: true,
      input: { rating: 5, body: 'Great service and on-time delivery.' },
    });
    expect(toReviewInput({ rating: 0, body: 'short' })).toEqual({
      ok: false,
      errors: { rating: 'Choose 1 to 5 stars.', body: 'Write between 20 and 1,000 characters.' },
    });
  });
});

describe('eligibilityText', () => {
  it('explains why a review cannot be written yet', () => {
    const now = new Date('2026-11-07T10:00:00.000Z');
    expect(eligibilityText('eligible', null, now)).toBeNull();
    expect(eligibilityText('own_business', null, now)).toMatch(/your own business/);
    expect(eligibilityText('no_thread', null, now)).toMatch(/24 hours later/);
    expect(eligibilityText('too_soon', '2026-11-07T15:30:00.000Z', now)).toBe(
      'You can review this business in about 6 hours.',
    );
  });

  it('explains refused reviews', () => {
    expect(reviewErrorMessage(new ApiError(409, 'REVIEW_EXISTS'))).toMatch(/already reviewed/);
    expect(reviewErrorMessage(new ApiError(403, 'REVIEW_NOT_ELIGIBLE'))).toMatch(/24 hours/);
  });
});
