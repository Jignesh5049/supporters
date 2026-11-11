import React from 'react';
import { View } from 'react-native';
import type { Comment } from '@supporters/shared';
import { Avatar, AvatarFallback } from '@supporters/ui-native/components/avatar';
import { Button } from '@supporters/ui-native/components/button';
import { Text } from '@supporters/ui-native/components/text';
import { useReportStore } from '../../moderation/moderation';
import { formatTimeAgo } from '../../social/mappers';
import { useViewerId } from '../../social/use-viewer';

export interface CommentItemProps {
  comment: Comment;
  canDelete: boolean;
  onReply: (comment: Comment) => void;
  onDelete: (comment: Comment) => void;
}

export function CommentItem({ comment, canDelete, onReply, onDelete }: CommentItemProps) {
  const viewerId = useViewerId();
  const openReport = useReportStore((state) => state.open);
  const canReport = viewerId !== null && viewerId !== comment.author.id;
  const initial = comment.author.name.trim().charAt(0).toUpperCase() || '?';
  return (
    <View className="flex-row gap-2.5">
      <Avatar alt={comment.author.name} className="size-8">
        <AvatarFallback className="bg-primary/10">
          <Text className="text-primary text-xs font-bold">{initial}</Text>
        </AvatarFallback>
      </Avatar>
      <View className="flex-1">
        <View className="bg-muted rounded-xl p-2.5">
          <View className="flex-row items-center justify-between">
            <View className="flex-shrink flex-row items-center gap-1.5">
              <Text className="text-sm font-semibold" numberOfLines={1}>
                {comment.author.name}
              </Text>
              {comment.isByBusiness ? (
                <Text className="text-primary text-[11px] font-bold">Business</Text>
              ) : null}
            </View>
            <Text variant="muted" className="text-xs">
              {formatTimeAgo(comment.createdAt)}
            </Text>
          </View>
          <Text className="mt-1 text-sm">{comment.body}</Text>
        </View>
        <View className="flex-row">
          <Button
            variant="ghost"
            size="sm"
            onPress={() => onReply(comment)}
            accessibilityLabel={`Reply to ${comment.author.name}`}
          >
            <Text className="text-xs">Reply</Text>
          </Button>
          {canDelete ? (
            <Button
              variant="ghost"
              size="sm"
              onPress={() => onDelete(comment)}
              accessibilityLabel="Delete comment"
            >
              <Text className="text-destructive text-xs">Delete</Text>
            </Button>
          ) : null}
          {canReport ? (
            <Button
              variant="ghost"
              size="sm"
              onPress={() => openReport('comment', comment.id)}
              accessibilityLabel={`Report comment by ${comment.author.name}`}
            >
              <Text className="text-muted-foreground text-xs">Report</Text>
            </Button>
          ) : null}
        </View>
      </View>
    </View>
  );
}
