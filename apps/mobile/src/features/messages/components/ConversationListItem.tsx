import React, { memo } from 'react';
import { Pressable, View } from 'react-native';
import { BadgeCheck, BellOff } from 'lucide-react-native';
import type { Conversation } from '@supporters/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@supporters/ui-native/components/avatar';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { cn } from '@supporters/ui-native/lib/utils';
import { counterpart } from '../chat-cache';
import { inboxTime, messagePreview } from '../labels';

interface ConversationListItemProps {
  conversation: Conversation;
  viewerId: string | null;
  onOpen: (conversation: Conversation) => void;
  onLongPress?: (conversation: Conversation) => void;
}

export const ConversationListItem = memo(function ConversationListItem({
  conversation,
  viewerId,
  onOpen,
  onLongPress,
}: ConversationListItemProps) {
  const peer = counterpart(conversation);
  const last = conversation.lastMessage;
  const preview = messagePreview(last, last?.senderId === viewerId);
  const hasUnread = conversation.unreadCount > 0;
  const unreadLabel = conversation.unreadCount > 99 ? '99+' : String(conversation.unreadCount);

  return (
    <Pressable
      onPress={() => onOpen(conversation)}
      onLongPress={onLongPress ? () => onLongPress(conversation) : undefined}
      className="border-border active:bg-muted min-h-16 flex-row items-center gap-3 border-b px-4 py-3"
      accessibilityRole="button"
      accessibilityLabel={`${peer.name}. ${preview}${hasUnread ? `. ${unreadLabel} unread` : ''}`}
      accessibilityHint="Opens the conversation"
    >
      <Avatar alt={peer.name} className="size-12">
        {peer.imageUrl ? <AvatarImage source={{ uri: peer.imageUrl }} /> : null}
        <AvatarFallback>
          <Text className="font-semibold">{peer.name.charAt(0).toUpperCase()}</Text>
        </AvatarFallback>
      </Avatar>
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-1">
          <Text className="flex-shrink text-sm font-semibold" numberOfLines={1}>
            {peer.name}
          </Text>
          {peer.isVerified ? <Icon as={BadgeCheck} size={14} className="text-info" /> : null}
          {conversation.muted ? (
            <Icon as={BellOff} size={13} className="text-muted-foreground" />
          ) : null}
          <Text variant="muted" className="ml-auto text-xs">
            {inboxTime(conversation.lastMessageAt)}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <Text
            variant="muted"
            className={cn('flex-1 text-xs', hasUnread && 'text-foreground font-semibold')}
            numberOfLines={1}
          >
            {preview}
          </Text>
          {hasUnread ? (
            <View className="bg-primary min-w-5 items-center rounded-full px-1.5 py-0.5">
              <Text className="text-primary-foreground text-xs font-bold">{unreadLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});
