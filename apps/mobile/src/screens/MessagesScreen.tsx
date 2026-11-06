import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, BellOff, Eye, EyeOff, MessageSquare, Search } from 'lucide-react-native';
import { CHAT_LIMITS, type Conversation } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Icon } from '@supporters/ui-native/components/icon';
import { Input } from '@supporters/ui-native/components/input';
import { Text } from '@supporters/ui-native/components/text';
import { EmptyState } from '@supporters/ui-native/patterns';
import { useApp } from '../context/AppContext';
import { messageForError } from '../lib/api';
import { ActionSheet, ConversationListItem } from '../features/messages/components';
import {
  useConversations,
  useUpdateConversation,
} from '../features/messages/hooks/use-conversations';
import { useViewerId } from '../features/social/use-viewer';

type InboxTab = 'chats' | 'hidden';

/** Waits until typing pauses before searching. */
function useDebounced(value: string, ms: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

function ConversationActions({
  conversation,
  onClose,
}: {
  conversation: Conversation | null;
  onClose: () => void;
}) {
  const { showToast } = useApp();
  const update = useUpdateConversation(conversation?.id ?? '');
  if (!conversation) return null;
  const apply = (data: { muted?: boolean; hidden?: boolean }, done: string) =>
    update.mutate(data, {
      onSuccess: () => showToast(done, 'info'),
      onError: (error) => showToast(messageForError(error), 'error'),
    });
  return (
    <ActionSheet
      title="Conversation"
      isOpen
      onClose={onClose}
      actions={[
        conversation.muted
          ? {
              key: 'unmute',
              label: 'Unmute',
              icon: Bell,
              onPress: () => apply({ muted: false }, 'Unmuted'),
            }
          : {
              key: 'mute',
              label: 'Mute',
              icon: BellOff,
              onPress: () => apply({ muted: true }, 'Muted'),
            },
        conversation.hidden
          ? {
              key: 'unhide',
              label: 'Show in inbox',
              icon: Eye,
              onPress: () => apply({ hidden: false }, 'Back in your inbox'),
            }
          : {
              key: 'hide',
              label: 'Hide',
              icon: EyeOff,
              onPress: () => apply({ hidden: true }, 'Hidden'),
            },
      ]}
    />
  );
}

/** The inbox: DMs and enquiries in one list (product spec, Messaging). */
export function MessagesScreen() {
  const router = useRouter();
  const viewerId = useViewerId();
  const [tab, setTab] = useState<InboxTab>('chats');
  const [search, setSearch] = useState('');
  const q = useDebounced(search, 300);
  const inbox = useConversations(q, { hidden: tab === 'hidden' });
  const [selected, setSelected] = useState<Conversation | null>(null);
  const conversations = inbox.data?.pages.flatMap((page) => page.data) ?? [];

  if (!viewerId) {
    return (
      <View className="bg-background flex-1 justify-center p-6">
        <EmptyState
          title="Sign in to message businesses"
          description="Your conversations and enquiries with suppliers appear here."
          actionLabel="Sign in"
          onAction={() => router.push('/sign-in')}
        />
      </View>
    );
  }

  return (
    <View className="bg-background flex-1">
      <View className="border-border bg-card gap-3 border-b px-4 pb-3 pt-3">
        <Text className="text-lg font-bold">Messages</Text>
        <View className="bg-muted flex-row items-center gap-2 rounded-xl px-3">
          <Icon as={Search} size={16} className="text-muted-foreground" />
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="Search by name"
            maxLength={CHAT_LIMITS.searchQueryMax}
            className="flex-1 border-0 bg-transparent"
            accessibilityLabel="Search conversations by name"
            returnKeyType="search"
          />
        </View>
        <View className="flex-row gap-2">
          {(
            [
              ['chats', 'Chats'],
              ['hidden', 'Hidden'],
            ] as const
          ).map(([value, label]) => (
            <Button
              key={value}
              size="sm"
              variant={tab === value ? 'default' : 'outline'}
              onPress={() => setTab(value)}
              accessibilityState={{ selected: tab === value }}
            >
              <Text>{label}</Text>
            </Button>
          ))}
        </View>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(conversation) => conversation.id}
        renderItem={({ item }) => (
          <ConversationListItem
            conversation={item}
            viewerId={viewerId}
            onOpen={(conversation) => router.push(`/messages/${conversation.id}`)}
            onLongPress={setSelected}
          />
        )}
        onEndReached={() => inbox.hasNextPage && !inbox.isFetchingNextPage && inbox.fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshing={inbox.isRefetching && !inbox.isFetchingNextPage}
        onRefresh={() => inbox.refetch()}
        ListFooterComponent={
          inbox.isFetchingNextPage ? <ActivityIndicator className="my-4" /> : undefined
        }
        ListEmptyComponent={
          inbox.isPending ? (
            <ActivityIndicator className="mt-10" />
          ) : inbox.isError ? (
            <View className="items-center gap-3 py-10">
              <Text className="text-center">{messageForError(inbox.error)}</Text>
              <Button variant="outline" onPress={() => inbox.refetch()}>
                <Text>Try again</Text>
              </Button>
            </View>
          ) : (
            <View className="items-center gap-2 px-6 py-16">
              <Icon as={MessageSquare} size={36} className="text-muted-foreground" />
              <Text className="text-base font-bold">
                {q
                  ? 'No conversations match'
                  : tab === 'hidden'
                    ? 'Nothing hidden'
                    : 'No conversations yet'}
              </Text>
              <Text variant="muted" className="text-center text-sm">
                {tab === 'hidden'
                  ? 'Conversations you hide appear here.'
                  : 'Message a business or send an enquiry from a product page to start.'}
              </Text>
            </View>
          )
        }
      />
      <ConversationActions conversation={selected} onClose={() => setSelected(null)} />
    </View>
  );
}
