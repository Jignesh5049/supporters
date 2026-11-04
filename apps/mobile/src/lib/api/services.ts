import {
  pageSchema,
  serviceSchema,
  createServiceSchema,
  updateServiceSchema,
  type CreateServiceInput,
  type Page,
  type Service,
  type UpdateServiceInput,
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

export interface ServicesApi {
  getPublic(id: string): Promise<Service>;
  listPublic(businessId: string, query?: ListQuery): Promise<Page<Service>>;
  listMine(query?: MyListingsInputQuery): Promise<Page<Service>>;
  create(data: CreateServiceInput): Promise<Service>;
  update(id: string, data: UpdateServiceInput): Promise<Service>;
  remove(id: string): Promise<void>;
}

export function createServicesApi(client: ApiClient): ServicesApi {
  return {
    getPublic: (id) =>
      client.request(`/services/${encodeURIComponent(id)}`, {
        schema: serviceSchema,
        auth: false,
      }),
    listPublic: (businessId, query) => {
      const search = new URLSearchParams();
      if (query?.cursor) search.set('cursor', query.cursor);
      if (query?.limit) search.set('limit', String(query.limit));
      const qs = search.toString();
      return client.request(
        `/businesses/${encodeURIComponent(businessId)}/services${qs ? `?${qs}` : ''}`,
        {
          schema: pageSchema(serviceSchema),
          auth: false,
        },
      );
    },
    listMine: (query) => {
      const search = new URLSearchParams();
      if (query?.cursor) search.set('cursor', query.cursor);
      if (query?.limit) search.set('limit', String(query.limit));
      if (query?.status) search.set('status', query.status);
      const qs = search.toString();
      return client.request(`/me/business/services${qs ? `?${qs}` : ''}`, {
        schema: pageSchema(serviceSchema),
      });
    },
    create: (data) =>
      client.request('/me/business/services', {
        method: 'POST',
        body: createServiceSchema.parse(data),
        schema: serviceSchema,
      }),
    update: (id, data) =>
      client.request(`/me/business/services/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: updateServiceSchema.parse(data),
        schema: serviceSchema,
      }),
    remove: (id) =>
      client.request(`/me/business/services/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  };
}
