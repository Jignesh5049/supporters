import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SaveTargetType } from '@supporters/shared';
import { socialApi } from '../../../lib/api';
import { cancelPostQueries, findCachedPost, updatePostInCaches } from '../post-cache';
import { socialKeys } from '../query-keys';

export interface SaveInput {
  type: SaveTargetType;
  id: string;
  isSaved: boolean;
}

/**
 * Save or unsave a post, product, service or business. Posts flip in every
 * cache at once and roll back on error; other targets refresh the saved lists.
 */
export function useToggleSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, id, isSaved }: SaveInput) => socialApi.setSaved(type, id, isSaved),
    onMutate: async ({ type, id, isSaved }) => {
      if (type !== 'post') return { before: undefined };
      await cancelPostQueries(queryClient);
      const before = findCachedPost(queryClient, id);
      updatePostInCaches(queryClient, id, (post) =>
        post.isSaved === isSaved
          ? post
          : { ...post, isSaved, saveCount: Math.max(0, post.saveCount + (isSaved ? 1 : -1)) },
      );
      return { before };
    },
    onError: (_error, { type, id }, context) => {
      const before = context?.before;
      if (type !== 'post' || !before) return;
      updatePostInCaches(queryClient, id, (post) => ({
        ...post,
        isSaved: before.isSaved,
        saveCount: before.saveCount,
      }));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: socialKeys.saves });
    },
  });
}
