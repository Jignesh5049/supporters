import {
  createQuoteSchema,
  createRequirementSchema,
  pageSchema,
  quoteSchema,
  requirementSchema,
  type CreateQuoteInput,
  type CreateRequirementInput,
  type Page,
  type Quote,
  type Requirement,
  type RequirementStatus,
} from '@supporters/shared';
import { z } from 'zod';
import type { ApiClient } from './client';
import { seg, toQueryString } from './query-string';

export interface RequirementsApi {
  /** Open requirements matched to my business, newest first. */
  matched(query?: { cursor?: string; limit?: number }): Promise<Page<Requirement>>;
  mine(query?: { cursor?: string; status?: RequirementStatus }): Promise<Page<Requirement>>;
  get(id: string): Promise<Requirement>;
  create(data: CreateRequirementInput): Promise<Requirement>;
  setStatus(id: string, status: 'closed' | 'fulfilled'): Promise<Requirement>;
  quotes(id: string, query?: { cursor?: string }): Promise<Page<Quote>>;
  /** `idempotencyKey` is made once per quote form and reused on retry. */
  quote(id: string, idempotencyKey: string, data: CreateQuoteInput): Promise<Quote>;
}

export function createRequirementsApi(client: ApiClient): RequirementsApi {
  return {
    matched: (query = {}) =>
      client.request(`/buyer-requirements${toQueryString({ ...query })}`, {
        schema: pageSchema(requirementSchema),
      }),
    mine: (query = {}) =>
      client.request(`/me/buyer-requirements${toQueryString({ ...query })}`, {
        schema: pageSchema(requirementSchema),
      }),
    get: (id) => client.request(`/buyer-requirements/${seg(id)}`, { schema: requirementSchema }),
    create: (data) =>
      client.request('/buyer-requirements', {
        method: 'POST',
        body: createRequirementSchema.parse(data),
        schema: requirementSchema,
      }),
    setStatus: (id, status) =>
      client.request(`/buyer-requirements/${seg(id)}`, {
        method: 'PATCH',
        body: { status },
        schema: requirementSchema,
      }),
    quotes: (id, query = {}) =>
      client.request(`/buyer-requirements/${seg(id)}/quotes${toQueryString({ ...query })}`, {
        schema: pageSchema(quoteSchema),
      }),
    quote: (id, idempotencyKey, data) =>
      client.request(`/buyer-requirements/${seg(id)}/quotes`, {
        method: 'POST',
        headers: { 'Idempotency-Key': z.uuid().parse(idempotencyKey) },
        body: createQuoteSchema.parse(data),
        schema: quoteSchema,
      }),
  };
}
