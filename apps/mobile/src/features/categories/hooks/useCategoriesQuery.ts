import { useQuery } from '@tanstack/react-query';
import { categoriesApi } from '../../../lib/api';

export const categoryKeys = {
  all: ['categories'] as const,
  tree: () => [...categoryKeys.all, 'tree'] as const,
};

export function useCategoriesQuery() {
  return useQuery({
    queryKey: categoryKeys.tree(),
    queryFn: () => categoriesApi.tree(),
    staleTime: 10 * 60_000,
  });
}
