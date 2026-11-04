import { PLAN_LIMITS } from '@supporters/shared';
import { ApiError, ApiErrorCode, listingLimitMessage, messageForError } from './errors';

describe('listing limit message', () => {
  it('names the free plan limit from the shared PLAN_LIMITS', () => {
    const message = messageForError(new ApiError(403, ApiErrorCode.ListingLimitReached));
    expect(message).toContain(String(PLAN_LIMITS.free.publishedListings));
    expect(message).toContain('free plan');
    expect(message).toBe(listingLimitMessage());
  });

  it('tells the owner what to do next', () => {
    expect(listingLimitMessage(25)).toMatch(/Archive one|upgrade/i);
  });

  it('has a message for an owner who already has a business', () => {
    expect(messageForError(new ApiError(409, ApiErrorCode.BusinessExists))).toMatch(
      /already have a business/,
    );
  });
});
