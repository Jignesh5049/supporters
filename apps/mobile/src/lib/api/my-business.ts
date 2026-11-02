import {
  myBusinessSchema,
  pageSchema,
  productSchema,
  serviceSchema,
  type CreateBusinessInput,
  type CreateProductInput,
  type CreateServiceInput,
  type ListingStatus,
  type UpdateBusinessInput,
  type UpdateProductInput,
  type UpdateServiceInput,
} from '@supporters/shared';
import type { ApiClient } from './client';
import { ApiError, ApiErrorCode } from './errors';

const productPageSchema = pageSchema(productSchema);
const servicePageSchema = pageSchema(serviceSchema);

function listQuery(cursor?: string | null, status?: ListingStatus): string {
  const params = new URLSearchParams();
  if (cursor) params.set('cursor', cursor);
  if (status) params.set('status', status);
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** The owner's endpoints under `/me/business`. Every call needs a session. */
export function createMyBusinessApi(client: ApiClient) {
  return {
    /** Resolves null when the user has no business yet (the API answers 404). */
    get: async () => {
      try {
        return await client.request('/me/business', { schema: myBusinessSchema });
      } catch (error) {
        if (error instanceof ApiError && error.code === ApiErrorCode.NotFound) return null;
        throw error;
      }
    },
    create: (input: CreateBusinessInput) =>
      client.request('/me/business', { method: 'POST', body: input, schema: myBusinessSchema }),
    update: (input: UpdateBusinessInput) =>
      client.request('/me/business', { method: 'PATCH', body: input, schema: myBusinessSchema }),

    products: (cursor?: string | null, status?: ListingStatus) =>
      client.request(`/me/business/products${listQuery(cursor, status)}`, {
        schema: productPageSchema,
      }),
    createProduct: (input: CreateProductInput) =>
      client.request('/me/business/products', {
        method: 'POST',
        body: input,
        schema: productSchema,
      }),
    updateProduct: (id: string, input: UpdateProductInput) =>
      client.request(`/me/business/products/${id}`, {
        method: 'PATCH',
        body: input,
        schema: productSchema,
      }),

    services: (cursor?: string | null, status?: ListingStatus) =>
      client.request(`/me/business/services${listQuery(cursor, status)}`, {
        schema: servicePageSchema,
      }),
    createService: (input: CreateServiceInput) =>
      client.request('/me/business/services', {
        method: 'POST',
        body: input,
        schema: serviceSchema,
      }),
    updateService: (id: string, input: UpdateServiceInput) =>
      client.request(`/me/business/services/${id}`, {
        method: 'PATCH',
        body: input,
        schema: serviceSchema,
      }),
  };
}

export type MyBusinessApi = ReturnType<typeof createMyBusinessApi>;
