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

/** Categories and subcategories as one list for a picker: "Textiles", "Textiles › Cotton". */
export function useCategoryOptions() {
  const query = useCategoriesQuery();
  const options = (query.data?.data ?? []).flatMap((category) => [
    { id: category.id, label: category.name },
    ...category.subcategories.map((sub) => ({
      id: sub.id,
      label: `${category.name} › ${sub.name}`,
    })),
  ]);
  return { options, isLoading: query.isPending };
}
