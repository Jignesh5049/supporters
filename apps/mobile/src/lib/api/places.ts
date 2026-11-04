import {
  citiesResponseSchema,
  statesResponseSchema,
  type City,
  type State,
} from '@supporters/shared';
import type { ApiClient } from './client';

export interface PlacesApi {
  states(): Promise<State[]>;
  /** The cities of one state, by its two-letter code. */
  cities(stateCode: string): Promise<City[]>;
}

export function createPlacesApi(client: ApiClient): PlacesApi {
  return {
    states: async () =>
      (await client.request('/places/states', { schema: statesResponseSchema, auth: false })).data,
    cities: async (stateCode) =>
      (
        await client.request(`/places/cities?state=${encodeURIComponent(stateCode)}`, {
          schema: citiesResponseSchema,
          auth: false,
        })
      ).data,
  };
}
