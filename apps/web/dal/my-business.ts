import 'server-only';
import {
  type MyBusiness,
  type Page,
  type Product,
  type Service,
  type ListingStatus,
  PAGINATION,
  myBusinessSchema,
  pageSchema,
  productSchema,
  serviceSchema,
} from '@supporters/shared';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { z } from 'zod';
import { apiGet } from './api-fetch';
import { requireSession } from './session';

/**
 * The signed-in owner's business and listings (`/v1/me/business*`). The API
 * checks ownership; these only forward the access cookie. Null means signed
 * out or no business yet.
 */
export const getMyBusiness = cache((): Promise<MyBusiness | null> =>
  apiGet('/v1/me/business', myBusinessSchema, { withSession: true }),
);

type ListingKind = 'products' | 'services';

interface ListOptions {
  status?: ListingStatus;
  cursor?: string;
}

async function listMine<T>(
  kind: ListingKind,
  schema: z.ZodType<T>,
  { status, cursor }: ListOptions = {},
): Promise<Page<T>> {
  const query = new URLSearchParams({ limit: String(PAGINATION.maxLimit) });
  if (status) query.set('status', status);
  if (cursor) query.set('cursor', cursor);
  const page = await apiGet(`/v1/me/business/${kind}?${query}`, pageSchema(schema), {
    withSession: true,
  });
  return page ?? { data: [], nextCursor: null };
}

export const listMyProducts = cache((cursor?: string): Promise<Page<Product>> =>
  listMine('products', productSchema, { cursor }),
);
export const listMyServices = cache((cursor?: string): Promise<Page<Service>> =>
  listMine('services', serviceSchema, { cursor }),
);

/** Pages scanned when looking one listing up (50 each). */
const MAX_PAGES = 10;

/**
 * One of the owner's listings, in any status. The API has no owner `GET` by
 * id yet (requested in the PR), so this walks the owner's list.
 */
async function findMine<T extends { id: string }>(
  kind: ListingKind,
  schema: z.ZodType<T>,
  id: string,
): Promise<T | null> {
  if (!z.uuid().safeParse(id).success) return null;
  let cursor: string | undefined;
  for (let i = 0; i < MAX_PAGES; i += 1) {
    const page = await listMine(kind, schema, { cursor });
    const found = page.data.find((listing) => listing.id === id);
    if (found) return found;
    if (!page.nextCursor) return null;
    cursor = page.nextCursor;
  }
  return null;
}

export const getMyProduct = cache((id: string): Promise<Product | null> =>
  findMine('products', productSchema, id),
);
export const getMyService = cache((id: string): Promise<Service | null> =>
  findMine('services', serviceSchema, id),
);

/**
 * For Hub pages: the session (or a redirect to login) and the owner's
 * business (or a redirect to onboarding when there is none yet).
 */
export async function requireMyBusiness(path: string): Promise<MyBusiness> {
  await requireSession(path);
  const business = await getMyBusiness();
  if (!business) redirect('/onboarding/business');
  return business;
}
