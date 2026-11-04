import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { z } from 'zod';
import type { Comment } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Text } from '@supporters/ui-native/components/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { ApiError, ApiErrorCode, messageForError } from '../lib/api';
import { useMyBusiness } from '../features/business/hooks';
import { CommentComposer, CommentThread, PostCard } from '../features/feed/components';
import { useAddComment, useComments, useDeleteComment, usePost } from '../features/feed/hooks';
import { usePostActions } from '../features/feed/use-post-actions';
import { toPostCardModel } from '../features/social/mappers';
import { useRequireAuth } from '../features/social/use-require-auth';
import { useViewerId } from '../features/social/use-viewer';

const paramsSchema = z.object({ id: z.uuid() });

function Header() {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="border-border bg-background flex-row items-center gap-2 border-b px-2 pb-2"
      style={{ paddingTop: Math.max(insets.top, 12) }}
    >
      <Button variant="ghost" size="icon" onPress={() => router.back()} accessibilityLabel="Back">
        <ArrowLeft size={20} className="text-foreground" />
      </Button>
      <Text className="text-base font-semibold">Post</Text>
    </View>
  );
}

export function PostDetailScreen() {
  const parsed = paramsSchema.safeParse(useLocalSearchParams());
  const postId = parsed.success ? parsed.data.id : '';
  const { showToast } = useApp();
  const viewerId = useViewerId();
  const requireAuth = useRequireAuth();
  const actions = usePostActions();
  const post = usePost(postId);
  const comments = useComments(postId);
  const addComment = useAddComment(postId);
  const deleteComment = useDeleteComment(postId);
  const myBusiness = useMyBusiness();
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  if (post.isPending && parsed.success) {
    return (
      <View className="bg-background flex-1">
        <Header />
        <ActivityIndicator className="mt-8" />
      </View>
    );
  }

  const isMissing =
    !parsed.success ||
    (post.error instanceof ApiError && post.error.code === ApiErrorCode.NotFound);
  if (!post.data) {
    return (
      <View className="bg-background flex-1">
        <Header />
        <View className="items-center gap-3 p-8">
          <Text className="text-center text-base font-semibold">
            {isMissing ? 'Post not found' : messageForError(post.error)}
          </Text>
          {isMissing ? (
            <Text variant="muted" className="text-center">
              It may have been removed or is no longer available.
            </Text>
          ) : (
            <Button onPress={() => post.refetch()}>
              <Text>Try again</Text>
            </Button>
          )}
        </View>
      </View>
    );
  }

  const isPostOwner = myBusiness.data?.id === post.data.business.id;
  const canDelete = (comment: Comment) =>
    viewerId !== null && (comment.author.id === viewerId || isPostOwner);

  const handleDelete = (comment: Comment) =>
    Alert.alert('Delete comment', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          deleteComment.mutate(comment, {
            onError: (error) => showToast(messageForError(error), 'error'),
          }),
      },
    ]);

  const handleSubmit = (body: string) =>
    new Promise<boolean>((resolve) => {
      if (viewerId === null) {
        // A guest is sent to sign-in; there is nothing to wait for.
        requireAuth(() => undefined);
        resolve(false);
        return;
      }
      addComment.mutate(
        { body, parentId: replyTo?.id },
        {
          onSuccess: () => {
            setReplyTo(null);
            resolve(true);
          },
          onError: (error) => {
            showToast(messageForError(error), 'error');
            resolve(false);
          },
        },
      );
    });

  const items = comments.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="bg-background flex-1"
    >
      <Header />
      <FlatList
        data={items}
        keyExtractor={(comment) => comment.id}
        ListHeaderComponent={
          <View className="pt-3">
            <PostCard
              post={toPostCardModel(post.data)}
              isDetail
              {...actions}
              onOpenPost={undefined}
            />
            <Text className="mx-4 mb-2 text-base font-semibold">
              Comments ({post.data.commentCount})
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="px-4">
            <CommentThread
              postId={postId}
              comment={item}
              canDelete={canDelete}
              onReply={(comment) => requireAuth(() => setReplyTo(comment))}
              onDelete={handleDelete}
            />
          </View>
        )}
        ListEmptyComponent={
          comments.isPending ? (
            <ActivityIndicator className="my-4" />
          ) : (
            <Text variant="muted" className="px-4 py-6 text-center">
              No comments yet. Start the conversation.
            </Text>
          )
        }
        onEndReached={() => {
          if (comments.hasNextPage && !comments.isFetchingNextPage) comments.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        keyboardShouldPersistTaps="handled"
      />
      <CommentComposer
        replyingTo={replyTo?.author.name ?? null}
        isSending={addComment.isPending}
        onCancelReply={() => setReplyTo(null)}
        onSubmit={handleSubmit}
      />
    </KeyboardAvoidingView>
  );
}
