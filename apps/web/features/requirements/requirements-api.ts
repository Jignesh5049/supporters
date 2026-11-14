import {
  type CreateQuoteInput,
  type CreateRequirementInput,
  type Page,
  type Quote,
  type Requirement,
  type RequirementStatus,
  pageSchema,
  quoteSchema,
  requirementSchema,
} from '@supporters/shared';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

/**
 * Browser calls for buyer requirements and quotes. Reads are validated with
 * the shared schemas; the API authorizes every call.
 */

const requirementPage = pageSchema(requirementSchema);
const quotePage = pageSchema(quoteSchema);

function withQuery(path: `/v1/${string}`, params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  return (query.size > 0 ? `${path}?${query}` : path) as `/v1/${string}`;
}

export const requirementsApi = {
  /** Open requirements matched to my business, newest first. */
  matched: async (cursor?: string, limit?: number): Promise<Page<Requirement>> =>
    requirementPage.parse(
      await api.request(
        withQuery('/v1/buyer-requirements', { cursor, limit: limit ? String(limit) : undefined }),
      ),
    ),

  mine: async (status?: RequirementStatus, cursor?: string): Promise<Page<Requirement>> =>
    requirementPage.parse(
      await api.request(withQuery('/v1/me/buyer-requirements', { status, cursor })),
    ),

  get: async (id: string): Promise<Requirement> =>
    requirementSchema.parse(await api.request(`/v1/buyer-requirements/${id}`)),

  create: async (body: CreateRequirementInput): Promise<Requirement> =>
    requirementSchema.parse(await api.request('/v1/buyer-requirements', { method: 'POST', body })),

  setStatus: async (id: string, status: 'closed' | 'fulfilled'): Promise<Requirement> =>
    requirementSchema.parse(
      await api.request(`/v1/buyer-requirements/${id}`, { method: 'PATCH', body: { status } }),
    ),

  quotes: async (id: string, cursor?: string): Promise<Page<Quote>> =>
    quotePage.parse(
      await api.request(withQuery(`/v1/buyer-requirements/${id}/quotes`, { cursor })),
    ),

  /** One Idempotency-Key per quote form: a retry returns the stored quote. */
  quote: async (id: string, idempotencyKey: string, body: CreateQuoteInput): Promise<Quote> =>
    quoteSchema.parse(
      await api.request(`/v1/buyer-requirements/${id}/quotes`, {
        method: 'POST',
        body,
        headers: { 'idempotency-key': idempotencyKey },
      }),
    ),
};

export const requirementKeys = {
  all: ['requirements'] as const,
  matched: ['requirements', 'matched'] as const,
  pinned: ['requirements', 'matched', 'pinned'] as const,
  mine: (status: RequirementStatus | null) => ['requirements', 'mine', status] as const,
  one: (id: string) => ['requirements', 'one', id] as const,
  quotes: (id: string) => ['requirements', 'quotes', id] as const,
};

export const matchedQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: requirementKeys.matched,
    queryFn: ({ pageParam }) => requirementsApi.matched(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

export const mineQueryOptions = (status: RequirementStatus | null) =>
  infiniteQueryOptions({
    queryKey: requirementKeys.mine(status),
    queryFn: ({ pageParam }) => requirementsApi.mine(status ?? undefined, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

export const requirementQueryOptions = (id: string) =>
  queryOptions({ queryKey: requirementKeys.one(id), queryFn: () => requirementsApi.get(id) });

export const quotesQueryOptions = (id: string) =>
  infiniteQueryOptions({
    queryKey: requirementKeys.quotes(id),
    queryFn: ({ pageParam }) => requirementsApi.quotes(id, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
