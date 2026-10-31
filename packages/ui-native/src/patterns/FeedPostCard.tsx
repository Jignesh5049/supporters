import * as React from 'react';
import { Image, Pressable, View } from 'react-native';
import { Avatar, AvatarFallback, AvatarImage } from '@supporters/ui-native/components/avatar';
import { Button } from '@supporters/ui-native/components/button';
import { Card } from '@supporters/ui-native/components/card';
import { Text } from '@supporters/ui-native/components/text';
import { cn } from '@supporters/ui-native/lib/utils';
import { CheckCircle2, Heart, MessageSquare, Share2 } from 'lucide-react-native';

export interface FeedPostCardData {
  id: string;
  authorName: string;
  authorBusinessName?: string;
  authorAvatar?: string;
  isVerified?: boolean;
  timeAgo?: string;
  content: string;
  imageUrl?: string;
  likesCount: number;
  commentsCount: number;
  isLiked?: boolean;
}

export interface FeedPostCardProps {
  post: FeedPostCardData;
  onLike?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onPress?: () => void;
  className?: string;
}

export function FeedPostCard({
  post,
  onLike,
  onComment,
  onShare,
  onPress,
  className,
}: FeedPostCardProps) {
  const initials = post.authorName
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Card className={cn('p-4', className)}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Post by ${post.authorName}`}
      >
        {/* Author Header */}
        <View className="flex flex-row items-center gap-3">
          <Avatar alt={post.authorName} className="size-10 rounded-full">
            {post.authorAvatar ? <AvatarImage source={{ uri: post.authorAvatar }} /> : null}
            <AvatarFallback className="bg-primary/10">
              <Text className="text-primary font-bold text-xs">{initials}</Text>
            </AvatarFallback>
          </Avatar>

          <View className="flex-1">
            <View className="flex flex-row items-center gap-1.5">
              <Text variant="large" className="font-bold text-sm" numberOfLines={1}>
                {post.authorName}
              </Text>
              {post.isVerified ? <CheckCircle2 size={13} color="#16A34A" /> : null}
            </View>

            <View className="flex flex-row items-center gap-2">
              {post.authorBusinessName ? (
                <Text variant="muted" className="text-xs" numberOfLines={1}>
                  {post.authorBusinessName}
                </Text>
              ) : null}
              {post.timeAgo ? (
                <Text variant="muted" className="text-[11px]">
                  • {post.timeAgo}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Content */}
        <Text className="mt-3 text-sm leading-relaxed" numberOfLines={6}>
          {post.content}
        </Text>

        {/* Optional Media */}
        {post.imageUrl ? (
          <Image
            source={{ uri: post.imageUrl }}
            className="mt-3 h-52 w-full rounded-xl bg-muted object-cover"
            resizeMode="cover"
          />
        ) : null}
      </Pressable>

      {/* Engagement Actions */}
      <View className="mt-3.5 flex flex-row items-center justify-between border-t border-border pt-2.5">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2"
          onPress={onLike}
          accessibilityLabel={post.isLiked ? 'Unlike' : 'Like'}
        >
          <Heart
            size={16}
            color={post.isLiked ? '#DC2626' : '#6B7280'}
            fill={post.isLiked ? '#DC2626' : 'transparent'}
          />
          <Text
            className={cn(
              'text-xs font-semibold',
              post.isLiked ? 'text-red-600' : 'text-muted-foreground',
            )}
          >
            {post.likesCount.toLocaleString('en-IN')}
          </Text>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2"
          onPress={onComment}
          accessibilityLabel="Comments"
        >
          <MessageSquare size={16} color="#6B7280" />
          <Text className="text-muted-foreground text-xs font-semibold">
            {post.commentsCount.toLocaleString('en-IN')}
          </Text>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-2"
          onPress={onShare}
          accessibilityLabel="Share"
        >
          <Share2 size={16} color="#6B7280" />
          <Text className="text-muted-foreground text-xs font-semibold">Share</Text>
        </Button>
      </View>
    </Card>
  );
}
