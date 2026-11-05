import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { Message, Page } from '@supporters/shared';
import type { RealtimeClient } from '../../lib/socket';
import {
  applyMessageToInbox,
  applyReadToConversation,
  insertMessage,
  newestMessage,
  patchConversation,
  type InboxData,
  type ThreadData,
} from './chat-cache';
import { usePendingStore } from './pending-store';
import { chatKeys } from './query-keys';

/** Catch-up pages to load before giving up and reloading the thread from the top. */
export const CATCH_UP_MAX_PAGES = 5;

/** The thread on screen: its messages are not unread, and it is marked read as they arrive. */
let onScreenConversationId: string | null = null;
export function setOnScreenConversation(id: string | null) {
  onScreenConversationId = id;
}
export const isOnScreen = (conversationId: string) => onScreenConversationId === conversationId;

/** A new message lands in its thread and in every inbox; unknown threads reload the inbox. */
export function applyIncomingMessage(queryClient: QueryClient, message: Message, viewerId: string) {
  queryClient.setQueryData<ThreadData>(chatKeys.thread(message.conversationId), (data) =>
    insertMessage(data, message),
  );
  let isKnown = false;
  for (const [key, data] of queryClient.getQueriesData<InboxData>({
    queryKey: chatKeys.inboxes,
  })) {
    const result = applyMessageToInbox(data, message, {
      viewerId,
      isOnScreen: isOnScreen(message.conversationId),
    });
    if (result.found) {
      isKnown = true;
      queryClient.setQueryData(key, result.data);
    }
  }
  patchConversation(queryClient, message.conversationId, (conversation) => ({
    ...conversation,
    lastMessage: message,
    lastMessageAt: message.createdAt,
  }));
  if (!isKnown) void queryClient.invalidateQueries({ queryKey: chatKeys.inboxes });
  usePendingStore.getState().remove(message.clientId);
}

/**
 * Loads what a cached thread missed while offline with `?after=<newest id>` (mobile spec,
 * Realtime). A long gap reloads the thread from the newest page instead.
 */
export async function catchUpThread(
  queryClient: QueryClient,
  conversationId: string,
  fetchAfter: (conversationId: string, after: string) => Promise<Page<Message>>,
  viewerId: string,
): Promise<void> {
  const newest = newestMessage(
    queryClient.getQueryData<ThreadData>(chatKeys.thread(conversationId)),
  );
  if (!newest) {
    await queryClient.invalidateQueries({ queryKey: chatKeys.thread(conversationId) });
    return;
  }
  let after: string | null = newest.id;
  for (let page = 0; page < CATCH_UP_MAX_PAGES && after; page += 1) {
    const result: Page<Message> = await fetchAfter(conversationId, after);
    // Oldest first: apply in order so the inbox ends on the newest one.
    for (const message of result.data) applyIncomingMessage(queryClient, message, viewerId);
    after = result.nextCursor;
  }
  if (after) await queryClient.resetQueries({ queryKey: chatKeys.thread(conversationId) });
}

/** Catches every cached thread up, then refreshes the inbox counts. */
export async function catchUpAll(
  queryClient: QueryClient,
  fetchAfter: (conversationId: string, after: string) => Promise<Page<Message>>,
  viewerId: string,
) {
  const threads = queryClient
    .getQueriesData<ThreadData>({ queryKey: chatKeys.messages })
    .map(([key]) => key[1])
    .filter((id): id is string => typeof id === 'string');
  await Promise.all(
    threads.map((id) =>
      catchUpThread(queryClient, id, fetchAfter, viewerId).catch(() =>
        queryClient.invalidateQueries({ queryKey: chatKeys.thread(id) }),
      ),
    ),
  );
  await queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
}

/**
 * Feeds socket events into the Query cache (mobile spec, Realtime: `message:new` updates the
 * conversation's cache directly). Mounted once, under the QueryClientProvider.
 */
export function useRealtimeChatSync(
  realtime: RealtimeClient,
  viewerId: string | null,
  fetchAfter: (conversationId: string, after: string) => Promise<Page<Message>>,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!viewerId) {
      usePendingStore.getState().clear();
      return undefined;
    }
    const pending = usePendingStore.getState();
    const subscriptions = [
      realtime.on('message', (message) => {
        applyIncomingMessage(queryClient, message, viewerId);
        if (isOnScreen(message.conversationId) && message.senderId !== viewerId) {
          void realtime.markRead(message.conversationId, message.id).catch(() => undefined);
        }
      }),
      realtime.on('read', (read) =>
        patchConversation(queryClient, read.conversationId, (conversation) =>
          applyReadToConversation(conversation, read, viewerId),
        ),
      ),
      realtime.on('connected', ({ isReconnect }) => {
        if (isReconnect) void catchUpAll(queryClient, fetchAfter, viewerId);
      }),
      realtime.on('sendFailed', ({ item, code }) => pending.fail(item.clientId, code)),
      // Over the socket, `message:new` replaces the bubble; over REST the reply carries it.
      realtime.on('sent', ({ result }) => {
        if (result.message) applyIncomingMessage(queryClient, result.message, viewerId);
      }),
    ];
    return () => {
      for (const unsubscribe of subscriptions) unsubscribe();
    };
  }, [queryClient, realtime, viewerId, fetchAfter]);
}
