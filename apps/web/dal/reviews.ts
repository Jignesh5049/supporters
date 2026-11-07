import 'server-only';
import { type ReviewsPage, reviewsPageSchema } from '@supporters/shared';
import { cache } from 'react';
import { apiGet } from './api-fetch';

/** The first page of a business's Reviews tab, with its rating; `isMine` for the viewer. */
export const listBusinessReviews = cache(
  async (businessId: string): Promise<ReviewsPage> =>
    (await apiGet(`/v1/businesses/${businessId}/reviews`, reviewsPageSchema, {
      withSession: 'optional',
    })) ?? { data: [], nextCursor: null, rating: { average: null, count: 0 } },
);
