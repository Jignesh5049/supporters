import {
  pageSchema,
  productSchema,
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type Page,
  type Product,
  type UpdateProductInput,
  type ListingStatus,
} from '@supporters/shared';
import type { ApiClient } from './client';

export interface ListQuery {
  cursor?: string;
  limit?: number;
}

export interface MyListingsInputQuery extends ListQuery {
  status?: ListingStatus;
}

export interface ProductsApi {
  getPublic(id: string): Promise<Product>;
  listPublic(businessId: string, query?: ListQuery): Promise<Page<Product>>;
  listMine(query?: MyListingsInputQuery): Promise<Page<Product>>;
  create(data: CreateProductInput): Promise<Product>;
  update(id: string, data: UpdateProductInput): Promise<Product>;
}

export function createProductsApi(client: ApiClient): ProductsApi {
  return {
    getPublic: (id) =>
      client.request(`/products/${encodeURIComponent(id)}`, {
        schema: productSchema,
        auth: false,
      }),
    listPublic: (businessId, query) => {
      const search = new URLSearchParams();
      if (query?.cursor) search.set('cursor', query.cursor);
      if (query?.limit) search.set('limit', String(query.limit));
      const qs = search.toString();
      return client.request(
        `/businesses/${encodeURIComponent(businessId)}/products${qs ? `?${qs}` : ''}`,
        {
          schema: pageSchema(productSchema),
          auth: false,
        }
      );
    },
    listMine: (query) => {
      const search = new URLSearchParams();
      if (query?.cursor) search.set('cursor', query.cursor);
      if (query?.limit) search.set('limit', String(query.limit));
      if (query?.status) search.set('status', query.status);
      const qs = search.toString();
      return client.request(`/me/business/products${qs ? `?${qs}` : ''}`, {
        schema: pageSchema(productSchema),
      });
    },
    create: (data) =>
      client.request('/me/business/products', {
        method: 'POST',
        body: createProductSchema.parse(data),
        schema: productSchema,
      }),
    update: (id, data) =>
      client.request(`/me/business/products/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: updateProductSchema.parse(data),
        schema: productSchema,
      }),
  };
}
