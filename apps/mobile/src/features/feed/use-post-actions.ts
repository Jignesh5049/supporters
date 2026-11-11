import { useMemo } from 'react';
import { router } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { useLikePost } from '../social/hooks/use-like-post';
import { useToggleSave } from '../social/hooks/use-save';
import type { PostCardModel } from '../social/mappers';
import { useRequireAuth } from '../social/use-require-auth';
import { messageForError } from '../../lib/api';
import { useReportStore } from '../moderation/moderation';
import type { PostCardProps } from './components/PostCard';

const seg = encodeURIComponent;

/** The handlers every PostCard needs: guests are sent to sign-in, failures show a toast. */
export function usePostActions(): Omit<PostCardProps, 'post' | 'isDetail'> {
  const requireAuth = useRequireAuth();
  const { openShareModal, showToast } = useApp();
  const like = useLikePost();
  const save = useToggleSave();
  const { mutate: mutateLike } = like;
  const { mutate: mutateSave } = save;
  const openReport = useReportStore((state) => state.open);

  return useMemo(
    () => ({
      onOpenPost: (postId: string) => router.push(`/post/${seg(postId)}`),
      onOpenBusiness: (slug: string) => router.push(`/business/${seg(slug)}`),
      onOpenAttachment: (attachment: NonNullable<PostCardModel['attachment']>) =>
        router.push(`/${attachment.type}/${seg(attachment.id)}`),
      onToggleLike: (post: PostCardModel) =>
        requireAuth(() =>
          mutateLike(
            { postId: post.id, isLiked: !post.isLiked },
            { onError: (error) => showToast(messageForError(error), 'error') },
          ),
        ),
      onToggleSave: (post: PostCardModel) =>
        requireAuth(() =>
          mutateSave(
            { type: 'post', id: post.id, isSaved: !post.isSaved },
            { onError: (error) => showToast(messageForError(error), 'error') },
          ),
        ),
      onShare: (post: PostCardModel) =>
        openShareModal({
          title: `${post.businessName} on Supporters`,
          url: `https://supporters.in/post/${seg(post.id)}`,
        }),
      onReport: (post: PostCardModel) => requireAuth(() => openReport('post', post.id)),
    }),
    [requireAuth, openShareModal, showToast, mutateLike, mutateSave, openReport],
  );
}
