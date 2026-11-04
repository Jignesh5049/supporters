import React, { memo } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import {
  Bookmark,
  CheckCircle2,
  Heart,
  MessageCircle,
  Play,
  Share2,
  Tag,
} from 'lucide-react-native';
import { Avatar, AvatarFallback, AvatarImage } from '@supporters/ui-native/components/avatar';
import { Icon } from '@supporters/ui-native/components/icon';
import { Button } from '@supporters/ui-native/components/button';
import { Card } from '@supporters/ui-native/components/card';
import { Text } from '@supporters/ui-native/components/text';
import { cn } from '@supporters/ui-native/lib/utils';
import { formatCount, type PostCardModel } from '../../social/mappers';

export interface PostCardProps {
  post: PostCardModel;
  /** Hides the comment shortcut on the post's own detail screen. */
  isDetail?: boolean;
  onOpenPost?: (postId: string) => void;
  onOpenBusiness: (slug: string) => void;
  onOpenAttachment: (attachment: NonNullable<PostCardModel['attachment']>) => void;
  onToggleLike: (post: PostCardModel) => void;
  onToggleSave: (post: PostCardModel) => void;
  onShare: (post: PostCardModel) => void;
}

function PostCardView({
  post,
  isDetail = false,
  onOpenPost,
  onOpenBusiness,
  onOpenAttachment,
  onToggleLike,
  onToggleSave,
  onShare,
}: PostCardProps) {
  const initials = post.businessName
    .split(' ')
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const cover = post.images[0];

  return (
    <Card className="mx-4 mb-3 p-4">
      <Pressable
        onPress={() => onOpenBusiness(post.businessSlug)}
        accessibilityRole="button"
        accessibilityLabel={`Open ${post.businessName}`}
        className="min-h-11 flex-row items-center gap-3"
      >
        <Avatar alt={post.businessName} className="size-10">
          {post.businessLogoUrl ? <AvatarImage source={{ uri: post.businessLogoUrl }} /> : null}
          <AvatarFallback className="bg-primary/10">
            <Text className="text-primary text-xs font-bold">{initials}</Text>
          </AvatarFallback>
        </Avatar>
        <View className="flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="flex-shrink text-sm font-bold" numberOfLines={1}>
              {post.businessName}
            </Text>
            {post.isVerified ? (
              <Icon
                as={CheckCircle2}
                size={13}
                className="text-primary"
                accessibilityLabel="Verified"
              />
            ) : null}
          </View>
          <Text variant="muted" className="text-xs">
            {post.city} · {post.timeAgo}
          </Text>
        </View>
      </Pressable>

      {post.offerTag ? (
        <View className="bg-secondary mt-3 flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-1">
          <Icon as={Tag} size={12} className="text-muted-foreground" />
          <Text className="text-xs font-semibold">{post.offerTag}</Text>
        </View>
      ) : null}

      <Pressable
        onPress={onOpenPost ? () => onOpenPost(post.id) : undefined}
        disabled={!onOpenPost}
        accessibilityRole={onOpenPost ? 'button' : undefined}
        accessibilityLabel={onOpenPost ? 'Open post' : undefined}
      >
        {post.body ? (
          <Text className="mt-3 text-sm leading-relaxed" numberOfLines={isDetail ? undefined : 6}>
            {post.body}
          </Text>
        ) : null}

        {cover ? (
          <View className="mt-3">
            <Image
              source={{ uri: cover.url }}
              style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 12 }}
              contentFit="cover"
              cachePolicy="disk"
              transition={150}
              accessibilityLabel="Post photo"
            />
            {post.images.length > 1 ? (
              <View className="bg-foreground/70 absolute right-2 top-2 rounded-full px-2 py-0.5">
                <Text className="text-background text-xs font-semibold">
                  1/{post.images.length}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {post.hasVideo ? (
          <View
            className="bg-muted mt-3 items-center justify-center rounded-xl"
            style={{ aspectRatio: 16 / 9 }}
            accessibilityLabel="Video post"
          >
            <Icon as={Play} size={32} className="text-muted-foreground" />
            <Text variant="muted" className="mt-1 text-xs">
              Video
            </Text>
          </View>
        ) : null}
      </Pressable>

      {post.attachment ? (
        <Pressable
          onPress={() => post.attachment && onOpenAttachment(post.attachment)}
          accessibilityRole="button"
          accessibilityLabel={`View ${post.attachment.type} ${post.attachment.title}`}
          className="border-border bg-muted/40 mt-3 min-h-11 flex-row items-center justify-between rounded-xl border p-3"
        >
          <View className="flex-1 pr-3">
            <Text className="text-sm font-semibold" numberOfLines={1}>
              {post.attachment.title}
            </Text>
            <Text variant="muted" className="text-xs">
              {post.attachment.price}
            </Text>
          </View>
          <Text className="text-primary text-xs font-semibold">View {post.attachment.type}</Text>
        </Pressable>
      ) : null}

      <View className="border-border mt-3 flex-row items-center justify-between border-t pt-2">
        <Text variant="muted" className="text-xs">
          {formatCount(post.likeCount, 'like')}
        </Text>
        <Text variant="muted" className="text-xs">
          {formatCount(post.commentCount, 'comment')}
        </Text>
      </View>

      <View className="mt-1 flex-row items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2"
          onPress={() => onToggleLike(post)}
          accessibilityLabel={post.isLiked ? 'Unlike' : 'Like'}
          accessibilityState={{ selected: post.isLiked }}
        >
          <Icon
            as={Heart}
            size={18}
            className={post.isLiked ? 'text-destructive fill-destructive' : 'text-muted-foreground'}
          />
          <Text className={cn('text-xs', post.isLiked && 'text-destructive')}>
            {post.isLiked ? 'Liked' : 'Like'}
          </Text>
        </Button>
        {!isDetail && onOpenPost ? (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 px-2"
            onPress={() => onOpenPost(post.id)}
            accessibilityLabel="Comments"
          >
            <Icon as={MessageCircle} size={18} className="text-muted-foreground" />
            <Text className="text-xs">Comment</Text>
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2"
          onPress={() => onShare(post)}
          accessibilityLabel="Share"
        >
          <Icon as={Share2} size={18} className="text-muted-foreground" />
          <Text className="text-xs">Share</Text>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2"
          onPress={() => onToggleSave(post)}
          accessibilityLabel={post.isSaved ? 'Unsave' : 'Save'}
          accessibilityState={{ selected: post.isSaved }}
        >
          <Icon
            as={Bookmark}
            size={18}
            className={post.isSaved ? 'text-primary fill-primary' : 'text-muted-foreground'}
          />
          <Text className="text-xs">{post.isSaved ? 'Saved' : 'Save'}</Text>
        </Button>
      </View>
    </Card>
  );
}

/** Memoised: a like on one post re-renders only that row. */
export const PostCard = memo(PostCardView);
