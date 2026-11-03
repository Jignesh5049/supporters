import {
  businessSchema,
  createBusinessSchema,
  myBusinessSchema,
  updateBusinessSchema,
  type Business,
  type CreateBusinessInput,
  type MyBusiness,
  type UpdateBusinessInput,
} from '@supporters/shared';
import type { ApiClient } from './client';

export interface BusinessesApi {
  getPublic(slug: string): Promise<Business>;
  getMine(): Promise<MyBusiness>;
  create(data: CreateBusinessInput): Promise<MyBusiness>;
  update(data: UpdateBusinessInput): Promise<MyBusiness>;
}

export function createBusinessesApi(client: ApiClient): BusinessesApi {
  return {
    getPublic: (slug) =>
      client.request(`/businesses/${encodeURIComponent(slug)}`, {
        schema: businessSchema,
        auth: false,
      }),
    getMine: () =>
      client.request('/me/business', {
        schema: myBusinessSchema,
      }),
    create: (data) =>
      client.request('/me/business', {
        method: 'POST',
        body: createBusinessSchema.parse(data),
        schema: myBusinessSchema,
      }),
    update: (data) =>
      client.request('/me/business', {
        method: 'PATCH',
        body: updateBusinessSchema.parse(data),
        schema: myBusinessSchema,
      }),
  };
}
