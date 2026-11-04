import React, { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import type { Comment } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Text } from '@supporters/ui-native/components/text';
import { useComments } from '../hooks';
import { CommentItem } from './CommentItem';

interface CommentThreadProps {
  postId: string;
  comment: Comment;
  canDelete: (comment: Comment) => boolean;
  /** Replying to a reply goes to its top-level comment (one level of replies). */
  onReply: (comment: Comment) => void;
  onDelete: (comment: Comment) => void;
}

/** A top-level comment with its replies, loaded when the viewer opens them. */
export function CommentThread({
  postId,
  comment,
  canDelete,
  onReply,
  onDelete,
}: CommentThreadProps) {
  const [showReplies, setShowReplies] = useState(false);
  const replies = useComments(postId, comment.id, showReplies);
  const items = replies.data?.pages.flatMap((page) => page.data) ?? [];
  // Replies come newest first from the API; read them oldest first under the comment.
  const ordered = [...items].reverse();

  return (
    <View className="mb-3">
      <CommentItem
        comment={comment}
        canDelete={canDelete(comment)}
        onReply={onReply}
        onDelete={onDelete}
      />
      {comment.replyCount > 0 ? (
        <View className="ml-10">
          {!showReplies ? (
            <Button
              variant="ghost"
              size="sm"
              className="self-start"
              onPress={() => setShowReplies(true)}
              accessibilityLabel={`View ${comment.replyCount} replies`}
            >
              <Text className="text-primary text-xs">
                View {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
              </Text>
            </Button>
          ) : (
            <View className="mt-1 gap-2">
              {replies.isPending ? <ActivityIndicator /> : null}
              {ordered.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  canDelete={canDelete(reply)}
                  onReply={() => onReply(comment)}
                  onDelete={onDelete}
                />
              ))}
              {replies.hasNextPage ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onPress={() => replies.fetchNextPage()}
                  disabled={replies.isFetchingNextPage}
                >
                  <Text className="text-primary text-xs">Show older replies</Text>
                </Button>
              ) : null}
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
}
