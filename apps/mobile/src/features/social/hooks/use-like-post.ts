import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postsApi } from '../../../lib/api';
import { cancelPostQueries, findCachedPost, updatePostInCaches } from '../post-cache';

export interface LikeInput {
  postId: string;
  isLiked: boolean;
}

/**
 * Like or unlike a post. Every cached copy changes at once and goes back to
 * its previous state if the API refuses; the server's count wins on success.
 */
export function useLikePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, isLiked }: LikeInput) => postsApi.setLiked(postId, isLiked),
    onMutate: async ({ postId, isLiked }) => {
      await cancelPostQueries(queryClient);
      const before = findCachedPost(queryClient, postId);
      updatePostInCaches(queryClient, postId, (post) =>
        post.isLiked === isLiked
          ? post
          : { ...post, isLiked, likeCount: Math.max(0, post.likeCount + (isLiked ? 1 : -1)) },
      );
      return { before };
    },
    onError: (_error, { postId }, context) => {
      const before = context?.before;
      if (!before) return;
      // Only the like fields roll back, so other optimistic changes survive.
      updatePostInCaches(queryClient, postId, (post) => ({
        ...post,
        isLiked: before.isLiked,
        likeCount: before.likeCount,
      }));
    },
    onSuccess: (state, { postId }) => {
      updatePostInCaches(queryClient, postId, (post) => ({ ...post, ...state }));
    },
  });
}
