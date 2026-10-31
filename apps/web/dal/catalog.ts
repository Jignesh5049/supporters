import 'server-only';
import {
  type Business,
  type Page,
  type Product,
  type Service,
  businessSchema,
  businessSlugSchema,
  pageSchema,
  productSchema,
  serviceSchema,
} from '@supporters/shared';
import { cache } from 'react';
import { z } from 'zod';
import { apiGet } from './api-fetch';

/** Public business, product and service reads. Only published listings come back. */

const uuid = z.uuid();

/** Most a business tab shows on the page (the API's page size cap). */
export const TAB_PAGE_SIZE = 50;

/** Null when the slug is malformed or no public business has it. */
export const getPublicBusiness = cache(async (slug: string): Promise<Business | null> => {
  if (!businessSlugSchema.safeParse(slug).success) return null;
  return apiGet(`/v1/businesses/${slug}`, businessSchema);
});

export const getPublicProduct = cache(async (id: string): Promise<Product | null> => {
  if (!uuid.safeParse(id).success) return null;
  return apiGet(`/v1/products/${id}`, productSchema);
});

export const getPublicService = cache(async (id: string): Promise<Service | null> => {
  if (!uuid.safeParse(id).success) return null;
  return apiGet(`/v1/services/${id}`, serviceSchema);
});

const emptyPage = <T>(): Page<T> => ({ data: [], nextCursor: null });

export const listBusinessProducts = cache(
  async (businessId: string, limit = TAB_PAGE_SIZE): Promise<Page<Product>> =>
    (await apiGet(
      `/v1/businesses/${businessId}/products?limit=${limit}`,
      pageSchema(productSchema),
    )) ?? emptyPage(),
);

export const listBusinessServices = cache(
  async (businessId: string, limit = TAB_PAGE_SIZE): Promise<Page<Service>> =>
    (await apiGet(
      `/v1/businesses/${businessId}/services?limit=${limit}`,
      pageSchema(serviceSchema),
    )) ?? emptyPage(),
);
