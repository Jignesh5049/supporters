import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateBusinessInput, UpdateBusinessInput } from '@supporters/shared';
import { businessesApi } from '../../../lib/api';

export const businessKeys = {
  all: ['business'] as const,
  detail: (slug: string) => [...businessKeys.all, 'detail', slug] as const,
  mine: () => [...businessKeys.all, 'mine'] as const,
};

export function useBusiness(slug: string) {
  return useQuery({
    queryKey: businessKeys.detail(slug),
    queryFn: () => businessesApi.getPublic(slug),
    enabled: Boolean(slug),
    staleTime: 5 * 60_000,
  });
}

export function useMyBusiness() {
  return useQuery({
    queryKey: businessKeys.mine(),
    queryFn: () => businessesApi.getMine(),
    staleTime: 5 * 60_000,
  });
}

export function useCreateBusinessMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateBusinessInput) => businessesApi.create(data),
    onSuccess: (newBusiness) => {
      queryClient.setQueryData(businessKeys.mine(), newBusiness);
      queryClient.invalidateQueries({ queryKey: businessKeys.all });
    },
  });
}

export function useUpdateBusinessMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateBusinessInput) => businessesApi.update(data),
    onSuccess: (updatedBusiness) => {
      queryClient.setQueryData(businessKeys.mine(), updatedBusiness);
      queryClient.invalidateQueries({ queryKey: businessKeys.all });
    },
  });
}
