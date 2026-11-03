import 'server-only';
import {
  type CategoryTree,
  type State,
  categoriesResponseSchema,
  statesResponseSchema,
} from '@supporters/shared';
import { cache } from 'react';
import { apiGet } from './api-fetch';

/** Reference data for forms. The API caches both for an hour. */

export const getCategories = cache(
  async (): Promise<CategoryTree[]> =>
    (await apiGet('/v1/categories', categoriesResponseSchema))?.data ?? [],
);

export const getStates = cache(
  async (): Promise<State[]> =>
    (await apiGet('/v1/places/states', statesResponseSchema))?.data ?? [],
);
