import {
  createEnquirySchema,
  enquirySchema,
  pageSchema,
  updateEnquirySchema,
  type EnquiryStatus,
  type Enquiry,
  type Page,
} from '@supporters/shared';
import { z } from 'zod';
import type { ApiClient } from './client';
import { seg, toQueryString } from './query-string';

/** The Contact Supplier form before Zod fills its defaults. */
export type EnquiryDraft = z.input<typeof createEnquirySchema>;

export interface BusinessEnquiriesQuery {
  cursor?: string;
  limit?: number;
  status?: EnquiryStatus;
  /** ISO date-times. */
  from?: string;
  to?: string;
  productId?: string;
  serviceId?: string;
}

export interface EnquiriesApi {
  /** `idempotencyKey` is made once per form submit and reused on retry. */
  create(idempotencyKey: string, data: EnquiryDraft): Promise<Enquiry>;
  mine(query?: { cursor?: string; limit?: number }): Promise<Page<Enquiry>>;
  forBusiness(query?: BusinessEnquiriesQuery): Promise<Page<Enquiry>>;
  close(id: string): Promise<Enquiry>;
}

export function createEnquiriesApi(client: ApiClient): EnquiriesApi {
  return {
    create: (idempotencyKey, data) =>
      client.request('/enquiries', {
        method: 'POST',
        headers: { 'Idempotency-Key': z.uuid().parse(idempotencyKey) },
        body: createEnquirySchema.parse(data),
        schema: enquirySchema,
      }),
    mine: (query = {}) =>
      client.request(`/me/enquiries${toQueryString({ ...query })}`, {
        schema: pageSchema(enquirySchema),
      }),
    forBusiness: (query = {}) =>
      client.request(`/me/business/enquiries${toQueryString({ ...query })}`, {
        schema: pageSchema(enquirySchema),
      }),
    close: (id) =>
      client.request(`/me/business/enquiries/${seg(id)}`, {
        method: 'PATCH',
        body: updateEnquirySchema.parse({ status: 'closed' }),
        schema: enquirySchema,
      }),
  };
}
