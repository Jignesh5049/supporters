import { useInfiniteQuery } from '@tanstack/react-query';
import type { Page, Product } from '@supporters/shared';
import { productsApi } from '../../../lib/api';

export const feedKeys = {
  all: ['feed'] as const,
  infinite: (category?: string) => [...feedKeys.all, 'infinite', category] as const,
};

export function useFeedQuery(businessId?: string) {
  return useInfiniteQuery<Page<Product>, Error>({
    queryKey: feedKeys.infinite(businessId),
    queryFn: ({ pageParam }) =>
      businessId
        ? productsApi.listPublic(businessId, { cursor: pageParam as string | undefined })
        : productsApi.listMine({ cursor: pageParam as string | undefined }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  });
}
