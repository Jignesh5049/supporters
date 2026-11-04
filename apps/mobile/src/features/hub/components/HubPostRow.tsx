import React from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import { PostStatus, type Post } from '@supporters/shared';
import { Badge } from '@supporters/ui-native/components/badge';
import { Button } from '@supporters/ui-native/components/button';
import { Text } from '@supporters/ui-native/components/text';
import { formatCount, formatTimeAgo } from '../../social/mappers';

export type PostAction = 'edit' | 'publish' | 'archive' | 'delete';

const STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

/** Which actions a post offers in each status (drafts publish, published posts archive). */
export function actionsFor(status: PostStatus): PostAction[] {
  switch (status) {
    case PostStatus.Draft:
      return ['edit', 'publish', 'delete'];
    case PostStatus.Published:
      return ['edit', 'archive', 'delete'];
    case PostStatus.Archived:
      return ['publish', 'delete'];
  }
}

const LABELS: Record<PostAction, (status: PostStatus) => string> = {
  edit: () => 'Edit',
  publish: (status) => (status === PostStatus.Archived ? 'Republish' : 'Publish'),
  archive: () => 'Archive',
  delete: () => 'Delete',
};

interface HubPostRowProps {
  post: Post;
  isBusy: boolean;
  onAction: (action: PostAction, post: Post) => void;
}

export function HubPostRow({ post, isBusy, onAction }: HubPostRowProps) {
  const cover = post.media.find((m) => m.kind === 'image');
  return (
    <View className="bg-card border-border mx-4 mb-3 gap-3 rounded-xl border p-3">
      <View className="flex-row gap-3">
        {cover ? (
          <Image
            source={{ uri: cover.url }}
            style={{ width: 64, height: 64, borderRadius: 8 }}
            contentFit="cover"
            cachePolicy="disk"
          />
        ) : null}
        <View className="flex-1 gap-1">
          <View className="flex-row items-center gap-2">
            <Badge variant={post.status === PostStatus.Published ? 'default' : 'secondary'}>
              <Text className="text-xs">{STATUS_LABELS[post.status]}</Text>
            </Badge>
            <Text variant="muted" className="text-xs">
              {formatTimeAgo(post.publishedAt ?? post.createdAt)}
            </Text>
          </View>
          <Text className="text-sm" numberOfLines={3}>
            {post.body || 'No text'}
          </Text>
          <Text variant="muted" className="text-xs">
            {formatCount(post.likeCount, 'like')} · {formatCount(post.commentCount, 'comment')}
          </Text>
        </View>
      </View>
      <View className="flex-row gap-2">
        {actionsFor(post.status).map((action) => (
          <Button
            key={action}
            variant={action === 'delete' ? 'destructive' : 'outline'}
            size="sm"
            className="flex-1"
            disabled={isBusy}
            onPress={() => onAction(action, post)}
            accessibilityLabel={`${LABELS[action](post.status)} post`}
          >
            <Text>{LABELS[action](post.status)}</Text>
          </Button>
        ))}
      </View>
    </View>
  );
}
