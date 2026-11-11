import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateQuoteInput,
  CreateRequirementInput,
  RequirementStatus,
} from '@supporters/shared';
import { requirementsApi } from '../../lib/api';
import { chatKeys } from '../messages/query-keys';
import { useViewerId } from '../social/use-viewer';

export const requirementKeys = {
  all: ['requirements'] as const,
  matched: (viewer: string) => ['requirements', viewer, 'matched'] as const,
  pinned: (viewer: string) => ['requirements', viewer, 'matched', 'pinned'] as const,
  mine: (viewer: string, status: RequirementStatus | null) =>
    ['requirements', viewer, 'mine', status] as const,
  one: (viewer: string, id: string) => ['requirements', viewer, 'one', id] as const,
  quotes: (viewer: string, id: string) => ['requirements', viewer, 'quotes', id] as const,
};

/** Open requirements matched to my business (GET /v1/buyer-requirements). */
export function useMatchedRequirements(enabled = true) {
  const viewerId = useViewerId();
  return useInfiniteQuery({
    queryKey: requirementKeys.matched(viewerId ?? 'guest'),
    queryFn: ({ pageParam }) => requirementsApi.matched({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: enabled && viewerId !== null,
  });
}

/** The newest matched requirement, pinned on top of a seller's feed. */
export function usePinnedRequirement(enabled: boolean) {
  const viewerId = useViewerId();
  return useQuery({
    queryKey: requirementKeys.pinned(viewerId ?? 'guest'),
    queryFn: async () => (await requirementsApi.matched({ limit: 1 })).data[0] ?? null,
    enabled: enabled && viewerId !== null,
    staleTime: 60_000,
  });
}

export function useMyRequirements(status: RequirementStatus | null) {
  const viewerId = useViewerId();
  return useInfiniteQuery({
    queryKey: requirementKeys.mine(viewerId ?? 'guest', status),
    queryFn: ({ pageParam }) =>
      requirementsApi.mine({ cursor: pageParam, status: status ?? undefined }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: viewerId !== null,
  });
}

export function useRequirement(id: string) {
  const viewerId = useViewerId();
  return useQuery({
    queryKey: requirementKeys.one(viewerId ?? 'guest', id),
    queryFn: () => requirementsApi.get(id),
    enabled: viewerId !== null && id !== '',
  });
}

export function useRequirementQuotes(id: string, enabled: boolean) {
  const viewerId = useViewerId();
  return useInfiniteQuery({
    queryKey: requirementKeys.quotes(viewerId ?? 'guest', id),
    queryFn: ({ pageParam }) => requirementsApi.quotes(id, { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: enabled && viewerId !== null,
  });
}

export function useCreateRequirement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRequirementInput) => requirementsApi.create(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: requirementKeys.all }),
  });
}

export function useSetRequirementStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'closed' | 'fulfilled' }) =>
      requirementsApi.setStatus(id, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: requirementKeys.all }),
  });
}

/** POST /v1/buyer-requirements/:id/quotes. The key is made by the form and reused on retry. */
export function useSendQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, key, input }: { id: string; key: string; input: CreateQuoteInput }) =>
      requirementsApi.quote(id, key, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: requirementKeys.all });
      // The quote is the newest message of its thread.
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
    },
  });
}
