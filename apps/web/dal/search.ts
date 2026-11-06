import 'server-only';
import {
  type SearchQuery,
  type SearchResult,
  searchQuerySchema,
  searchResultSchema,
} from '@supporters/shared';
import { cache } from 'react';
import { apiGet } from './api-fetch';

export const searchAll = cache(async (params: SearchQuery): Promise<SearchResult> => {
  const valid = searchQuerySchema.safeParse(params);
  if (!valid.success) {
    return {
      query: '',
      counts: { all: 0, businesses: 0, products: 0, services: 0, requirements: 0 },
      businesses: [],
      products: [],
      services: [],
      requirements: [],
    };
  }
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.type) searchParams.set('type', params.type);
  if (params.category) searchParams.set('category', params.category);
  if (params.city) searchParams.set('city', params.city);
  searchParams.set('page', String(params.page || 1));
  searchParams.set('limit', String(params.limit || 20));

  try {
    const res = await apiGet(`/v1/search?${searchParams.toString()}`, searchResultSchema, {
      withSession: 'optional',
    });
    return (
      res ?? {
        query: params.q || '',
        counts: { all: 0, businesses: 0, products: 0, services: 0, requirements: 0 },
        businesses: [],
        products: [],
        services: [],
        requirements: [],
      }
    );
  } catch {
    return {
      query: params.q || '',
      counts: { all: 0, businesses: 0, products: 0, services: 0, requirements: 0 },
      businesses: [],
      products: [],
      services: [],
      requirements: [],
    };
  }
});
