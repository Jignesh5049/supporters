import type { Page } from '@supporters/shared';
import { type InfiniteData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { catalogApi } from '../../lib/api';

/** Mobile spec, Caching: profiles and categories stay fresh for 5 minutes. */
export const PROFILE_STALE_MS = 5 * 60_000;

export const catalogKeys = {
  business: (slug: string) => ['business', slug] as const,
  businessProducts: (businessId: string) => ['business', businessId, 'products'] as const,
  businessServices: (businessId: string) => ['business', businessId, 'services'] as const,
  product: (id: string) => ['product', id] as const,
  service: (id: string) => ['service', id] as const,
  categories: ['categories'] as const,
  states: ['places', 'states'] as const,
  cities: (stateCode: string) => ['places', 'cities', stateCode] as const,
};

/** Every item loaded so far, across pages. */
export function flattenPages<T>(data: InfiniteData<Page<T>> | undefined): T[] {
  return data?.pages.flatMap((page) => page.data) ?? [];
}

const pageOptions = {
  initialPageParam: null as string | null,
  getNextPageParam: (last: Page<unknown>) => last.nextCursor,
};

/** A null slug or id (an invalid route param) disables the query. */
export function useBusiness(slug: string | null) {
  return useQuery({
    queryKey: catalogKeys.business(slug ?? ''),
    queryFn: () => catalogApi.business(slug ?? ''),
    enabled: slug !== null,
    staleTime: PROFILE_STALE_MS,
  });
}

export function useBusinessProducts(businessId: string | undefined) {
  return useInfiniteQuery({
    queryKey: catalogKeys.businessProducts(businessId ?? ''),
    queryFn: ({ pageParam }) => catalogApi.businessProducts(businessId ?? '', pageParam),
    enabled: businessId !== undefined,
    ...pageOptions,
  });
}

export function useBusinessServices(businessId: string | undefined) {
  return useInfiniteQuery({
    queryKey: catalogKeys.businessServices(businessId ?? ''),
    queryFn: ({ pageParam }) => catalogApi.businessServices(businessId ?? '', pageParam),
    enabled: businessId !== undefined,
    ...pageOptions,
  });
}

export function useProduct(id: string | null) {
  return useQuery({
    queryKey: catalogKeys.product(id ?? ''),
    queryFn: () => catalogApi.product(id ?? ''),
    enabled: id !== null,
  });
}

export function useService(id: string | null) {
  return useQuery({
    queryKey: catalogKeys.service(id ?? ''),
    queryFn: () => catalogApi.service(id ?? ''),
    enabled: id !== null,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: async () => (await catalogApi.categories()).data,
    staleTime: PROFILE_STALE_MS,
  });
}

export function useStates() {
  return useQuery({
    queryKey: catalogKeys.states,
    queryFn: async () => (await catalogApi.states()).data,
    staleTime: Infinity,
  });
}

export function useCities(stateCode: string) {
  return useQuery({
    queryKey: catalogKeys.cities(stateCode),
    queryFn: async () => (await catalogApi.cities(stateCode)).data,
    enabled: stateCode !== '',
    staleTime: Infinity,
  });
}
