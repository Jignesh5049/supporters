import {
  businessSchema,
  categoriesResponseSchema,
  citiesResponseSchema,
  pageSchema,
  productSchema,
  serviceSchema,
  statesResponseSchema,
} from '@supporters/shared';
import type { ApiClient } from './client';

const productPageSchema = pageSchema(productSchema);
const servicePageSchema = pageSchema(serviceSchema);

/** `?cursor=` only when there is one. */
export function pageQuery(cursor?: string | null): string {
  return cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
}

/** Public catalog endpoints: businesses, listings, categories and places. */
export function createCatalogApi(client: ApiClient) {
  return {
    business: (slug: string) =>
      client.request(`/businesses/${encodeURIComponent(slug)}`, { schema: businessSchema }),
    businessProducts: (businessId: string, cursor?: string | null) =>
      client.request(`/businesses/${businessId}/products${pageQuery(cursor)}`, {
        schema: productPageSchema,
      }),
    businessServices: (businessId: string, cursor?: string | null) =>
      client.request(`/businesses/${businessId}/services${pageQuery(cursor)}`, {
        schema: servicePageSchema,
      }),
    product: (id: string) => client.request(`/products/${id}`, { schema: productSchema }),
    service: (id: string) => client.request(`/services/${id}`, { schema: serviceSchema }),
    categories: () => client.request('/categories', { schema: categoriesResponseSchema }),
    states: () => client.request('/places/states', { schema: statesResponseSchema }),
    cities: (stateCode: string) =>
      client.request(`/places/cities?state=${encodeURIComponent(stateCode)}`, {
        schema: citiesResponseSchema,
      }),
  };
}

export type CatalogApi = ReturnType<typeof createCatalogApi>;
