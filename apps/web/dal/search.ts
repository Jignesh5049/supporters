import 'server-only';
import { type DiscoverResponse, discoverResponseSchema } from '@supporters/shared';
import { cache } from 'react';
import { z } from 'zod';
import { apiGet } from './api-fetch';

const EMPTY: DiscoverResponse = {
  trending: [],
  featured: [],
  nearYou: { city: null, data: [] },
  suggested: [],
};

/**
 * The Discover sections. The access cookie goes along when there is one, so a
 * signed-in viewer gets their city, Suggested, and their own business left out.
 */
export const getDiscover = cache(async (city?: string): Promise<DiscoverResponse> => {
  const query = city && z.uuid().safeParse(city).success ? `?city=${city}` : '';
  return (
    (await apiGet(`/v1/discover${query}`, discoverResponseSchema, { withSession: 'optional' })) ??
    EMPTY
  );
});
