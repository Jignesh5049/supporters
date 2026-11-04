'use client';

import type {
  Conversation,
  Message,
  SendMessageInput,
  UpdateConversationInput,
} from '@supporters/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { getChatSocket } from '@/lib/socket/browser-chat-socket';
import type { ConnectionStatus, PendingMessage } from '@/lib/socket/chat-socket';
import { chatApi } from './chat-api';
import {
  type InboxFilter,
  type ThreadData,
  chatKeys,
  removeFromInboxes,
  removeMessage,
  threadMessages,
  unreadTotal,
  updateConversation,
} from './chat-cache';
import { newestFromPeer, settledClientIds, threadView } from './chat-mappers';
import { conversationQueryOptions, inboxQueryOptions, threadQueryOptions } from './chat-queries';

const subscribeOutbox = (onChange: () => void) => getChatSocket().on('outbox', onChange);
const readOutbox = () => getChatSocket().pending();
const EMPTY: readonly PendingMessage[] = [];

/** Unsent and just-sent messages of this tab. */
export function useOutbox(): readonly PendingMessage[] {
  return useSyncExternalStore(subscribeOutbox, readOutbox, () => EMPTY);
}

const subscribeStatus = (onChange: () => void) => getChatSocket().on('status', onChange);

export function useConnectionStatus(): ConnectionStatus {
  return useSyncExternalStore(
    subscribeStatus,
    () => getChatSocket().status,
    () => 'idle',
  );
}

export function useInbox(filter: InboxFilter) {
  return useInfiniteQuery(inboxQueryOptions(filter));
}

/** Unread messages across the loaded inbox pages, for the nav badge. Zero while signed out. */
export function useUnreadCount(): number {
  // The socket runs only while signed in, so its status doubles as the session signal here.
  const isEnabled = useConnectionStatus() !== 'idle';
  const { data } = useInfiniteQuery({
    ...inboxQueryOptions({ q: null, hidden: false }),
    enabled: isEnabled,
  });
  return isEnabled ? unreadTotal(data) : 0;
}

export function useConversation(conversationId: string) {
  const client = useQueryClient();
  return useQuery(conversationQueryOptions(client, conversationId));
}

/**
 * A thread: history pages from the API plus this tab's pending sends, oldest
 * first. Sent copies leave the outbox once the cache holds them.
 */
export function useThread(conversation: Conversation) {
  const query = useInfiniteQuery(threadQueryOptions(conversation.id));
  const outbox = useOutbox();
  const messages = useMemo(() => threadMessages(query.data), [query.data]);
  const views = useMemo(
    () => threadView(conversation, messages, outbox),
    [conversation, messages, outbox],
  );

  useEffect(() => {
    const settled = settledClientIds(messages, outbox);
    if (settled.length > 0) getChatSocket().settle(settled);
  }, [messages, outbox]);

  return { ...query, messages, views };
}

export function useSendMessage(conversationId: string) {
  return useCallback(
    (input: SendMessageInput) => getChatSocket().send(conversationId, input),
    [conversationId],
  );
}

export function useRetryMessage() {
  return useCallback((clientId: string) => getChatSocket().retry(clientId), []);
}

export function useDiscardMessage() {
  return useCallback((clientId: string) => getChatSocket().discard(clientId), []);
}

function useIsPageVisible(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      document.addEventListener('visibilitychange', onChange);
      return () => document.removeEventListener('visibilitychange', onChange);
    },
    () => document.visibilityState === 'visible',
    () => false,
  );
}

/**
 * Marks the thread read while it is on screen: whenever the newest message
 * from the other end is past the read pointer. Unread drops to zero at once.
 */
export function useMarkRead(conversation: Conversation, messages: readonly Message[]) {
  const client = useQueryClient();
  const isVisible = useIsPageVisible();
  const newest = newestFromPeer(messages, conversation.side);
  const target = newest?.id ?? null;
  const isUnread =
    target !== null && (target !== conversation.lastReadMessageId || conversation.unreadCount > 0);
  const sentFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isVisible || !isUnread || !target || sentFor.current === target) return;
    sentFor.current = target;
    updateConversation(client, conversation.id, (c) => ({
      ...c,
      lastReadMessageId: target,
      unreadCount: 0,
    }));
    getChatSocket()
      .markRead(conversation.id, target)
      .catch(() => {
        // Not worth an error: the next message or visit marks it again.
        sentFor.current = null;
      });
  }, [client, conversation.id, isUnread, isVisible, target]);
}

/** Whether the other end is typing. The API sends `false` after 5 s of quiet. */
export function usePeerTyping(conversationId: string): boolean {
  const [typingIn, setTypingIn] = useState<string | null>(null);
  useEffect(() => {
    let safety: ReturnType<typeof setTimeout> | undefined;
    const off = getChatSocket().on('typing', (payload) => {
      if (payload.conversationId !== conversationId) return;
      clearTimeout(safety);
      if (payload.isTyping) {
        setTypingIn(conversationId);
        // In case the stop is lost with a dropped connection.
        safety = setTimeout(() => setTypingIn(null), 8_000);
      } else {
        setTypingIn(null);
      }
    });
    return () => {
      off();
      clearTimeout(safety);
    };
  }, [conversationId]);
  return typingIn === conversationId;
}

/** Sends `typing` as the user types (throttled by the socket client) and a stop when done. */
export function useTypingNotifier(conversationId: string) {
  useEffect(() => () => getChatSocket().typing(conversationId, false), [conversationId]);
  return useCallback(
    (isTyping: boolean) => getChatSocket().typing(conversationId, isTyping),
    [conversationId],
  );
}

/** Whether the other end is online: asked on (re)connect, then pushed by the API. */
export function usePeerOnline(conversation: Conversation): boolean | null {
  const status = useConnectionStatus();
  const [state, setState] = useState<{ id: string; online: boolean | null }>({
    id: conversation.id,
    online: null,
  });
  const peerUserId = conversation.side === 'business' ? conversation.user.id : null;
  const peerBusinessId = conversation.side === 'user' ? conversation.business.id : null;

  useEffect(() => {
    if (status !== 'connected') return;
    let isCurrent = true;
    void getChatSocket()
      .presence(conversation.id)
      .then((online) => {
        if (isCurrent) setState({ id: conversation.id, online });
      });
    const off = getChatSocket().on('presence', (payload) => {
      const isPeer = peerUserId
        ? payload.userId === peerUserId
        : payload.businessId !== null && payload.businessId === peerBusinessId;
      if (isPeer) setState({ id: conversation.id, online: payload.online });
    });
    return () => {
      isCurrent = false;
      off();
    };
  }, [conversation.id, peerBusinessId, peerUserId, status]);

  if (status !== 'connected' || state.id !== conversation.id) return null;
  return state.online;
}

/** Mute or hide (`PATCH /conversations/:id`). Hiding takes the thread out of the inbox. */
export function useUpdateConversation(conversationId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateConversationInput) => chatApi.update(conversationId, input),
    onSuccess: (conversation) => {
      updateConversation(client, conversationId, () => conversation);
      if (conversation.hidden) removeFromInboxes(client, conversationId);
      void client.invalidateQueries({ queryKey: chatKeys.inboxes });
    },
  });
}

/** Delete for me: the message leaves this account's copy of the thread only. */
export function useDeleteMessage(conversationId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => chatApi.deleteForMe(messageId),
    onSuccess: (_result, messageId) => {
      client.setQueryData<ThreadData>(chatKeys.thread(conversationId), (data) =>
        removeMessage(data, messageId),
      );
      void client.invalidateQueries({ queryKey: chatKeys.inboxes });
    },
  });
}

/**
 * Block or unblock the account at the other end. The API hides the thread
 * from the blocker's inbox; the thread stays open here so it can be undone.
 */
export function useSetBlocked(conversationId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isBlocked }: { userId: string; isBlocked: boolean }) =>
      chatApi.setBlocked(userId, isBlocked),
    onSuccess: (state) => {
      if (state.isBlocked) removeFromInboxes(client, conversationId);
      void client.invalidateQueries({ queryKey: chatKeys.inboxes });
    },
  });
}

/** Opens (or finds) the thread with a business. */
export function useOpenConversation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (businessId: string) => chatApi.open(businessId),
    onSuccess: (conversation) => {
      client.setQueryData(chatKeys.conversation(conversation.id), conversation);
      void client.invalidateQueries({ queryKey: chatKeys.inboxes });
    },
  });
}
