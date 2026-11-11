import {
  discoverResponseSchema,
  searchResponseSchema,
  suggestResponseSchema,
  type DiscoverResponse,
  type SearchQuery,
  type SearchResponse,
  type Suggestion,
} from '@supporters/shared';
import type { ApiClient } from './client';
import { toQueryString } from './query-string';

export interface SearchApi {
  search(
    query: Omit<SearchQuery, 'limit' | 'cursor'> & { cursor?: string | undefined },
  ): Promise<SearchResponse>;
  /** Up to 8 names and titles, from 2 characters. */
  suggest(q: string): Promise<Suggestion[]>;
  /** Guests pass `city` for Near you; a signed-in user gets their own city and Suggested. */
  discover(city?: string): Promise<DiscoverResponse>;
}

export function createSearchApi(client: ApiClient): SearchApi {
  return {
    search: (query) =>
      client.request(
        `/search${toQueryString({
          ...query,
          verified: query.verified ? 'true' : undefined,
        })}`,
        { schema: searchResponseSchema },
      ),
    suggest: async (q) =>
      (
        await client.request(`/search/suggest${toQueryString({ q })}`, {
          schema: suggestResponseSchema,
        })
      ).data,
    discover: (city) =>
      client.request(`/discover${toQueryString({ city })}`, { schema: discoverResponseSchema }),
  };
}
