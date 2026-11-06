import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Bell,
  BellOff,
  EyeOff,
  FileText,
  Image as ImageIcon,
  MoreVertical,
  Package,
  ShieldBan,
  ShieldCheck,
  Store,
} from 'lucide-react-native';
import { z } from 'zod';
import type { ListingCard, Message } from '@supporters/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@supporters/ui-native/components/avatar';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Text } from '@supporters/ui-native/components/text';
import { EmptyState } from '@supporters/ui-native/patterns';
import { useApp } from '../context/AppContext';
import { messageForError, uploadsApi } from '../lib/api';
import {
  CHAT_PICK_MESSAGES,
  pickChatDocument,
  pickChatImages,
  uploadChatFiles,
  type ChatPick,
} from '../features/messages/attachments';
import { counterpart, peerUserId } from '../features/messages/chat-cache';
import {
  ActionSheet,
  ChatComposer,
  ListingShareSheet,
  MessageBubble,
  type SheetAction,
} from '../features/messages/components';
import {
  useConversation,
  useSetBlocked,
  useUpdateConversation,
} from '../features/messages/hooks/use-conversations';
import {
  useConnectionStatus,
  useDeleteMessage,
  useMarkThreadRead,
  usePeerPresence,
  usePeerTyping,
  useSendMessage,
  useThread,
  type ThreadItem,
} from '../features/messages/hooks/use-thread';
import { realtime } from '../lib/socket';

const paramsSchema = z.object({ conversationId: z.uuid() });

function statusLine(options: { isTyping: boolean; online: boolean | null; subtitle: string }) {
  if (options.isTyping) return 'typing…';
  if (options.online) return 'Online';
  return options.subtitle;
}

function Thread({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const { showToast } = useApp();
  const conversation = useConversation(conversationId);
  const data = conversation.data ?? null;
  const { messages, items, flat } = useThread(data, conversationId);
  useMarkThreadRead(data, flat);
  const isTyping = usePeerTyping(conversationId);
  const online = usePeerPresence(data);
  const connection = useConnectionStatus();
  const { send, retry, discard } = useSendMessage(conversationId);
  const remove = useDeleteMessage(conversationId);
  const update = useUpdateConversation(conversationId);
  const block = useSetBlocked(conversationId);
  const isBlocked = useQuery<boolean>({
    queryKey: ['blocks', conversationId],
    queryFn: () => false,
    enabled: false,
  }).data;
  const [menuOpen, setMenuOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [listingOpen, setListingOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const blockedByFailure = items.some(
    (item) =>
      item.kind === 'local' && item.local.status === 'failed' && item.local.code === 'BLOCKED',
  );
  const peerId = data ? peerUserId(data, flat) : null;

  const openListing = useCallback(
    (listing: ListingCard) => router.push(`/${listing.type}/${listing.id}`),
    [router],
  );

  const confirmDelete = useCallback(
    (message: Message) =>
      Alert.alert('Delete for me?', 'The other person still sees it.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            remove.mutate(message.id, {
              onError: (error) => showToast(messageForError(error), 'error'),
            }),
        },
      ]),
    [remove, showToast],
  );

  const handleLocal = useCallback(
    (item: Extract<ThreadItem, { kind: 'local' }>) => {
      if (item.local.status !== 'failed') return;
      Alert.alert('Message not sent', undefined, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => discard(item.local) },
        { text: 'Retry', onPress: () => retry(item.local) },
      ]);
    },
    [discard, retry],
  );

  const sendFiles = async (pick: () => Promise<ChatPick>) => {
    const picked = await pick().catch(() => null);
    if (!picked) return;
    if (!picked.ok) {
      showToast(CHAT_PICK_MESSAGES[picked.problem], 'error');
      return;
    }
    if (picked.files.length === 0) return;
    setIsUploading(true);
    try {
      const attachmentIds = await uploadChatFiles(uploadsApi, picked.files);
      send(
        { type: picked.kind, attachmentIds },
        picked.kind === 'image'
          ? { imageUris: picked.files.map((file) => file.uri) }
          : { fileName: picked.files[0]?.name ?? 'PDF document' },
      );
    } catch (error) {
      showToast(messageForError(error), 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const setBlocked = (next: boolean) => {
    if (!peerId) return;
    block.mutate(
      { userId: peerId, isBlocked: next },
      {
        onSuccess: () => showToast(next ? 'Blocked' : 'Unblocked', 'info'),
        onError: (error) => showToast(messageForError(error), 'error'),
      },
    );
  };

  const confirmBlock = () => {
    if (!data) return;
    const name = counterpart(data).name;
    if (!peerId) {
      Alert.alert(
        `Block ${name}?`,
        'You can block this business once it has replied to you. To stop notifications now, mute the conversation.',
      );
      return;
    }
    Alert.alert(
      `Block ${name}?`,
      'Neither of you can message the other, and the conversation leaves your inbox.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Block', style: 'destructive', onPress: () => setBlocked(true) },
      ],
    );
  };

  const actions: SheetAction[] = [];
  if (data) {
    if (data.side === 'user') {
      actions.push({
        key: 'business',
        label: 'View business',
        icon: Store,
        onPress: () => router.push(`/business/${data.business.slug}`),
      });
    }
    actions.push(
      data.muted
        ? {
            key: 'unmute',
            label: 'Unmute',
            icon: Bell,
            onPress: () => update.mutate({ muted: false }),
          }
        : {
            key: 'mute',
            label: 'Mute notifications',
            icon: BellOff,
            onPress: () => update.mutate({ muted: true }),
          },
      {
        key: 'hide',
        label: 'Hide conversation',
        icon: EyeOff,
        onPress: () =>
          update.mutate(
            { hidden: true },
            {
              onSuccess: () => {
                showToast('Hidden. Find it under Hidden in Messages.', 'info');
                router.back();
              },
            },
          ),
      },
      isBlocked
        ? { key: 'unblock', label: 'Unblock', icon: ShieldCheck, onPress: () => setBlocked(false) }
        : {
            key: 'block',
            label: 'Block',
            icon: ShieldBan,
            isDestructive: true,
            onPress: confirmBlock,
          },
    );
  }

  if (conversation.isPending) {
    return <ActivityIndicator className="mt-16" />;
  }
  if (!data) {
    return (
      <View className="flex-1 justify-center p-6">
        <EmptyState
          title="Conversation not found"
          description={
            conversation.isError
              ? messageForError(conversation.error)
              : 'It may have been hidden, or the link is wrong.'
          }
          actionLabel="Back to messages"
          onAction={() => router.replace('/messages')}
        />
      </View>
    );
  }

  const peer = counterpart(data);
  const attachActions: SheetAction[] = [
    {
      key: 'photos',
      label: 'Photos',
      icon: ImageIcon,
      onPress: () => void sendFiles(pickChatImages),
    },
    {
      key: 'pdf',
      label: 'PDF document',
      icon: FileText,
      onPress: () => void sendFiles(pickChatDocument),
    },
    {
      key: 'listing',
      label: 'Share a listing',
      icon: Package,
      onPress: () => setListingOpen(true),
    },
  ];

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="border-border bg-card flex-row items-center gap-2 border-b px-2 py-2">
        <Button variant="ghost" size="icon" onPress={() => router.back()} accessibilityLabel="Back">
          <Icon as={ArrowLeft} size={20} />
        </Button>
        <Avatar alt={peer.name} className="size-9">
          {peer.imageUrl ? <AvatarImage source={{ uri: peer.imageUrl }} /> : null}
          <AvatarFallback>
            <Text className="font-semibold">{peer.name.charAt(0).toUpperCase()}</Text>
          </AvatarFallback>
        </Avatar>
        <View className="flex-1" accessibilityLiveRegion="polite">
          <Text className="text-sm font-bold" numberOfLines={1}>
            {peer.name}
          </Text>
          <Text
            className={
              isTyping || online ? 'text-success text-xs' : 'text-muted-foreground text-xs'
            }
            numberOfLines={1}
          >
            {statusLine({ isTyping, online, subtitle: peer.subtitle })}
          </Text>
        </View>
        <Button
          variant="ghost"
          size="icon"
          onPress={() => setMenuOpen(true)}
          accessibilityLabel="Conversation options"
        >
          <Icon as={MoreVertical} size={20} />
        </Button>
      </View>

      {connection === 'offline' ? (
        <View className="bg-warning-soft px-4 py-1.5">
          <Text className="text-xs">Offline. Messages send when you reconnect.</Text>
        </View>
      ) : null}

      <FlatList
        inverted
        data={items}
        keyExtractor={(item) => item.key}
        contentContainerClassName="gap-2 px-3 py-3"
        renderItem={({ item }) => (
          <MessageBubble
            item={item}
            onOpenListing={openListing}
            onLongPressMessage={confirmDelete}
            onPressLocal={handleLocal}
          />
        )}
        onEndReached={() =>
          messages.hasNextPage && !messages.isFetchingNextPage && messages.fetchNextPage()
        }
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          messages.isFetchingNextPage || messages.isPending ? (
            <ActivityIndicator className="my-4" />
          ) : undefined
        }
        ListEmptyComponent={
          messages.isPending ? undefined : messages.isError ? (
            <View className="items-center gap-3 py-10">
              <Text className="text-center">{messageForError(messages.error)}</Text>
              <Button variant="outline" onPress={() => messages.refetch()}>
                <Text>Try again</Text>
              </Button>
            </View>
          ) : (
            <Text variant="muted" className="py-10 text-center text-sm">
              Say hello, or ask about prices, MOQ and delivery.
            </Text>
          )
        }
      />

      {isBlocked ? (
        <View className="border-border bg-card flex-row items-center gap-3 border-t px-4 py-3">
          <Text variant="muted" className="flex-1 text-sm">
            You blocked {peer.name}.
          </Text>
          <Button size="sm" variant="outline" onPress={() => setBlocked(false)}>
            <Text>Unblock</Text>
          </Button>
        </View>
      ) : (
        <ChatComposer
          disabledReason={blockedByFailure ? "You can't message in this conversation." : undefined}
          isUploading={isUploading}
          onSend={(body) => send({ type: 'text', body })}
          onAttach={() => setAttachOpen(true)}
          onTyping={(typing) => realtime.typing(conversationId, typing)}
        />
      )}

      <ActionSheet
        title={peer.name}
        isOpen={menuOpen}
        actions={actions}
        onClose={() => setMenuOpen(false)}
      />
      <ActionSheet
        title="Send"
        isOpen={attachOpen}
        actions={attachActions}
        onClose={() => setAttachOpen(false)}
      />
      <ListingShareSheet
        businessId={data.business.id}
        isOpen={listingOpen}
        onClose={() => setListingOpen(false)}
        onPick={(listing, title) =>
          send({ type: 'listing_card', listing }, { listingTitle: title })
        }
      />
    </KeyboardAvoidingView>
  );
}

/** One DM thread (`/messages/:conversationId`). The id is checked before anything loads. */
export function ChatDetailScreen() {
  const params = useLocalSearchParams<{ conversationId: string }>();
  const parsed = paramsSchema.safeParse(params);
  return (
    <SafeAreaView className="bg-background flex-1" edges={['top', 'bottom']}>
      {parsed.success ? (
        <Thread key={parsed.data.conversationId} conversationId={parsed.data.conversationId} />
      ) : (
        <View className="flex-1 justify-center p-6">
          <EmptyState title="Conversation not found" description="The link is not valid." />
        </View>
      )}
    </SafeAreaView>
  );
}
