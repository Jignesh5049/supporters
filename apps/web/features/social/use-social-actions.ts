'use client';

import type { FollowState } from '@supporters/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/context/AppContext';
import { errorMessage } from '@/lib/api/errors';
import { followUpdates, likeUpdates, saveUpdates, socialKeys } from './post-cache';
import { socialApi } from './social-api';

/**
 * Like, save and follow with optimistic updates: the cache changes at once,
 * the request follows, and a failure rolls the change back with a toast.
 */

export function useLikePost() {
  const client = useQueryClient();
  const { showToast } = useApp();
  return useMutation({
    mutationFn: ({ postId, isLiked }: { postId: string; isLiked: boolean }) =>
      socialApi.setLike(postId, isLiked),
    onMutate: async ({ postId, isLiked }) => {
      // A refetch landing now would overwrite the optimistic value.
      await client.cancelQueries({ queryKey: socialKeys.all });
      likeUpdates(client, postId, isLiked).apply();
    },
    onError: (error, { postId, isLiked }) => {
      likeUpdates(client, postId, isLiked).rollback();
      showToast(errorMessage(error), 'error');
    },
    onSuccess: (state, { postId, isLiked }) => likeUpdates(client, postId, isLiked).settle(state),
  });
}

export function useSavePost() {
  const client = useQueryClient();
  const { showToast } = useApp();
  return useMutation({
    mutationFn: ({ postId, isSaved }: { postId: string; isSaved: boolean }) =>
      socialApi.setSaved('post', postId, isSaved),
    onMutate: async ({ postId, isSaved }) => {
      await client.cancelQueries({ queryKey: socialKeys.all });
      saveUpdates(client, postId, isSaved).apply();
    },
    onError: (error, { postId, isSaved }) => {
      saveUpdates(client, postId, isSaved).rollback();
      showToast(errorMessage(error), 'error');
    },
    onSuccess: (_state, { isSaved }) =>
      showToast(isSaved ? 'Saved. Find it under Saved.' : 'Removed from Saved.', 'success'),
  });
}

/**
 * One business's follow state, seeded from the server render. Every follow
 * button for the business shares it.
 */
export function useFollow(businessId: string, initial: FollowState) {
  const client = useQueryClient();
  const { showToast } = useApp();
  const { data = initial } = useQuery({
    queryKey: socialKeys.follow(businessId),
    // Only ever written by the mutation below; there is no single-business read yet.
    queryFn: () => client.getQueryData<FollowState>(socialKeys.follow(businessId)) ?? initial,
    initialData: initial,
    staleTime: Infinity,
  });
  const mutation = useMutation({
    mutationFn: (isFollowing: boolean) => socialApi.setFollowing(businessId, isFollowing),
    onMutate: (isFollowing) => followUpdates(client, businessId, isFollowing).apply(),
    onError: (error, isFollowing) => {
      followUpdates(client, businessId, isFollowing).rollback();
      showToast(errorMessage(error), 'error');
    },
    onSuccess: (state, isFollowing) => {
      followUpdates(client, businessId, isFollowing).settle(state);
      void client.invalidateQueries({ queryKey: socialKeys.following });
      void client.invalidateQueries({ queryKey: socialKeys.followers(businessId) });
    },
  });
  return { state: data, toggle: () => mutation.mutate(!data.isFollowing) };
}
