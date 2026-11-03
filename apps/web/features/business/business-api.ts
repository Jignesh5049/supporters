import type {
  CreateBusinessInput,
  MyBusiness,
  Product,
  Service,
  UpdateBusinessInput,
} from '@supporters/shared';
import { api } from '@/lib/api/client';

/** Owner writes. The API authorizes every one; the browser client adds the CSRF header. */

export const createBusiness = (body: CreateBusinessInput) =>
  api.request<MyBusiness>('/v1/me/business', { method: 'POST', body });

export const updateBusiness = (body: UpdateBusinessInput) =>
  api.request<MyBusiness>('/v1/me/business', { method: 'PATCH', body });

export type ListingKind = 'products' | 'services';

/** Creates (no id) or updates a listing. The body was validated by the shared schema. */
export const saveListing = (kind: ListingKind, id: string | null, body: Record<string, unknown>) =>
  id
    ? api.request<Product | Service>(`/v1/me/business/${kind}/${id}`, { method: 'PATCH', body })
    : api.request<Product | Service>(`/v1/me/business/${kind}`, { method: 'POST', body });

export const deleteListing = (kind: ListingKind, id: string) =>
  api.request(`/v1/me/business/${kind}/${id}`, { method: 'DELETE' });
