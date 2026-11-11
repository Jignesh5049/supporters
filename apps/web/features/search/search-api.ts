import {
  type City,
  type SearchResponse,
  type Suggestion,
  citiesResponseSchema,
  searchResponseSchema,
  suggestResponseSchema,
} from '@supporters/shared';
import { api } from '@/lib/api/client';
import { type SearchState, searchApiPath } from './search-params';

/** Browser calls for search. Responses are validated with the shared schemas. */
export const searchApi = {
  search: async (
    state: SearchState,
    cursor?: string,
    signal?: AbortSignal,
  ): Promise<SearchResponse> =>
    searchResponseSchema.parse(await api.request(searchApiPath(state, cursor), { signal })),

  suggest: async (q: string, signal?: AbortSignal): Promise<Suggestion[]> =>
    suggestResponseSchema.parse(
      await api.request(`/v1/search/suggest?${new URLSearchParams({ q })}`, { signal }),
    ).data,

  cities: async (stateCode: string): Promise<City[]> =>
    citiesResponseSchema.parse(
      await api.request(`/v1/places/cities?state=${encodeURIComponent(stateCode)}`),
    ).data,
};

export const searchKeys = {
  all: ['search'] as const,
  results: (state: SearchState) => ['search', 'results', state] as const,
  suggest: (q: string) => ['search', 'suggest', q] as const,
  cities: (stateCode: string) => ['places', 'cities', stateCode] as const,
};
