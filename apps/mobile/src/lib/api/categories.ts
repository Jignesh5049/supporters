import { categoriesResponseSchema } from '@supporters/shared';
import type { z } from 'zod';
import type { ApiClient } from './client';

export type CategoriesResponse = z.infer<typeof categoriesResponseSchema>;

export interface CategoriesApi {
  tree(): Promise<CategoriesResponse>;
}

export function createCategoriesApi(client: ApiClient): CategoriesApi {
  return {
    tree: () =>
      client.request('/categories', {
        schema: categoriesResponseSchema,
        auth: false,
      }),
  };
}
