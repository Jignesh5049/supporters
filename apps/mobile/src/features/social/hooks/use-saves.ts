import { useInfiniteQuery } from '@tanstack/react-query';
import type { SaveTargetType } from '@supporters/shared';
import { socialApi } from '../../../lib/api';
import { socialKeys } from '../query-keys';
import { useViewerId } from '../use-viewer';

/** The signed-in user's saved items (`/me/saves`), optionally of one type. */
export function useSaves(type?: SaveTargetType) {
  const viewerId = useViewerId();
  return useInfiniteQuery({
    queryKey: [...socialKeys.savesOfType(type), viewerId],
    queryFn: ({ pageParam }) => socialApi.saves({ cursor: pageParam, type }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: viewerId !== null,
  });
}
