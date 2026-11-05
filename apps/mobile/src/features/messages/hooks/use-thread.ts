import { useCallback, useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { CHAT_LIMITS, MEDIA_LIMITS, type Conversation, type Message } from '@supporters/shared';
import { chatApi, type SendMessageDraft } from '../../../lib/api';
import { realtime, type ConnectionStatus, type OutboxItem } from '../../../lib/socket';
import { useViewerId } from '../../social/use-viewer';
import {
  flattenThread,
  patchConversation,
  readMessageIds,
  removeMessage,
  type ThreadData,
} from '../chat-cache';
import {
  pendingFor,
  usePendingStore,
  type LocalMessage,
  type LocalPreview,
} from '../pending-store';
import { chatKeys } from '../query-keys';
import { setOnScreenConversation } from '../realtime-sync';

/** History (GET /v1/conversations/:id/messages), newest first; older pages load on scroll. */
export function useThreadMessages(conversationId: string) {
  const viewerId = useViewerId();
  return useInfiniteQuery({
    queryKey: chatKeys.thread(conversationId),
    queryFn: ({ pageParam }) => chatApi.messages(conversationId, { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: viewerId !== null && conversationId.length > 0,
    // The socket keeps the thread fresh; refetching on focus would only reload old pages.
    staleTime: Infinity,
  });
}

export type ThreadItem =
  | { kind: 'message'; key: string; message: Message; isMine: boolean; isRead: boolean }
  | { kind: 'local'; key: string; local: LocalMessage };

/**
 * The thread as drawn, newest first: unsent messages on top, then the server's. A pending
 * message disappears as soon as the server copy (same clientId) is in the cache.
 */
export function buildThreadItems(
  messages: Message[],
  pending: LocalMessage[],
  options: { viewerId: string | null; peerLastReadMessageId: string | null },
): ThreadItem[] {
  const delivered = new Set(messages.map((message) => message.clientId));
  const read = readMessageIds(messages, options.peerLastReadMessageId);
  const local: ThreadItem[] = pending
    .filter((entry) => !delivered.has(entry.item.clientId))
    .map((entry) => ({ kind: 'local', key: entry.item.clientId, local: entry }));
  const server: ThreadItem[] = messages.map((message) => ({
    kind: 'message',
    key: message.id,
    message,
    isMine: message.senderId === options.viewerId,
    isRead: read.has(message.id),
  }));
  return [...local, ...server];
}

export function useThread(conversation: Conversation | null | undefined, conversationId: string) {
  const viewerId = useViewerId();
  const messages = useThreadMessages(conversationId);
  const byClientId = usePendingStore((state) => state.byClientId);
  const flat = useMemo(
    () => flattenThread(messages.data as ThreadData | undefined),
    [messages.data],
  );
  const items = useMemo(
    () =>
      buildThreadItems(flat, pendingFor(byClientId, conversationId), {
        viewerId,
        peerLastReadMessageId: conversation?.peerLastReadMessageId ?? null,
      }),
    [flat, byClientId, conversationId, viewerId, conversation?.peerLastReadMessageId],
  );

  // Messages queued before a restart show up as pending again.
  useEffect(() => {
    let isLive = true;
    void realtime.pending(conversationId).then((queued) => {
      if (isLive) usePendingStore.getState().hydrate(queued);
    });
    return () => {
      isLive = false;
    };
  }, [conversationId]);

  // Drop pending entries whose server copy arrived through a refetch.
  useEffect(() => {
    const delivered = new Set(flat.map((message) => message.clientId));
    const store = usePendingStore.getState();
    for (const entry of pendingFor(store.byClientId, conversationId)) {
      if (delivered.has(entry.item.clientId)) store.remove(entry.item.clientId);
    }
  }, [flat, conversationId]);

  return { messages, items, flat };
}

/** Sends with a fresh clientId; the same id is reused for every retry of that message. */
export function useSendMessage(conversationId: string) {
  const viewerId = useViewerId();
  const send = useCallback(
    (draft: SendMessageDraft, preview?: LocalPreview) => {
      if (!viewerId) return;
      const item: OutboxItem = {
        clientId: randomUUID(),
        conversationId,
        userId: viewerId,
        draft: {
          type: draft.type,
          ...(draft.body ? { body: draft.body } : {}),
          ...(draft.attachmentIds?.length ? { attachmentIds: draft.attachmentIds } : {}),
          ...(draft.listing ? { listing: draft.listing } : {}),
        },
        createdAt: new Date().toISOString(),
      };
      usePendingStore.getState().add(item, preview);
      void realtime.send(item);
    },
    [conversationId, viewerId],
  );
  const retry = useCallback((local: LocalMessage) => {
    usePendingStore.getState().retry(local.item.clientId);
    void realtime.send(local.item);
  }, []);
  const discard = useCallback((local: LocalMessage) => {
    usePendingStore.getState().remove(local.item.clientId);
    void realtime.discard(local.item.clientId);
  }, []);
  return { send, retry, discard };
}

/** Delete for me (DELETE /v1/messages/:id): gone from this account only, optimistic. */
export function useDeleteMessage(conversationId: string) {
  const queryClient = useQueryClient();
  const key = chatKeys.thread(conversationId);
  return useMutation({
    mutationFn: (messageId: string) => chatApi.deleteForMe(messageId),
    onMutate: async (messageId) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ThreadData>(key);
      queryClient.setQueryData<ThreadData>(key, (data) => removeMessage(data, messageId));
      return { previous };
    },
    onError: (_error, _id, context) => queryClient.setQueryData(key, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: chatKeys.inboxes }),
  });
}

/**
 * While the thread is on screen: mark the newest message from the other end as read, and
 * keep new ones from counting as unread.
 */
export function useMarkThreadRead(conversation: Conversation | null | undefined, flat: Message[]) {
  const queryClient = useQueryClient();
  const viewerId = useViewerId();
  const conversationId = conversation?.id ?? null;
  const newestFromPeer = flat.find((message) => message.senderId !== viewerId) ?? null;
  const lastRead = conversation?.lastReadMessageId ?? null;
  const unread = conversation?.unreadCount ?? 0;

  useEffect(() => {
    setOnScreenConversation(conversationId);
    return () => setOnScreenConversation(null);
  }, [conversationId]);

  useEffect(() => {
    if (!conversationId || !newestFromPeer) return;
    if (newestFromPeer.id === lastRead && unread === 0) return;
    patchConversation(queryClient, conversationId, (current) => ({
      ...current,
      unreadCount: 0,
      lastReadMessageId: newestFromPeer.id,
    }));
    void realtime.markRead(conversationId, newestFromPeer.id).catch(() => undefined);
  }, [queryClient, conversationId, newestFromPeer, lastRead, unread]);
}

export function useConnectionStatus(): ConnectionStatus {
  const [status, setStatus] = useState(realtime.status());
  useEffect(() => realtime.on('status', setStatus), []);
  return status;
}

/** The other end is typing. The server sends `isTyping:false` after 5 s; this is a backstop. */
export function usePeerTyping(conversationId: string): boolean {
  const viewerId = useViewerId();
  const [isTyping, setIsTyping] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = realtime.on('typing', (event) => {
      if (event.conversationId !== conversationId || event.userId === viewerId) return;
      clearTimeout(timer);
      setIsTyping(event.isTyping);
      if (event.isTyping) {
        timer = setTimeout(() => setIsTyping(false), (CHAT_LIMITS.typingTtlSec + 1) * 1000);
      }
    });
    const stopOnMessage = realtime.on('message', (message) => {
      if (message.conversationId === conversationId && message.senderId !== viewerId) {
        setIsTyping(false);
      }
    });
    return () => {
      clearTimeout(timer);
      off();
      stopOnMessage();
    };
  }, [conversationId, viewerId]);
  return isTyping;
}

/** Online while the other end has a socket open; null when unknown. Never last-seen. */
export function usePeerPresence(conversation: Conversation | null | undefined): boolean | null {
  const status = useConnectionStatus();
  const [online, setOnline] = useState<boolean | null>(null);
  const id = conversation?.id;
  const side = conversation?.side;
  const businessId = conversation?.business.id;
  const userId = conversation?.user.id;

  useEffect(() => {
    if (!id || status !== 'connected') {
      setOnline(null);
      return undefined;
    }
    let isLive = true;
    void realtime.presence(id).then((value) => {
      if (isLive) setOnline(value);
    });
    const off = realtime.on('presence', (event) => {
      const isPeer = side === 'user' ? event.businessId === businessId : event.userId === userId;
      if (isPeer) setOnline(event.online);
    });
    return () => {
      isLive = false;
      off();
    };
  }, [id, side, businessId, userId, status]);
  return online;
}

/**
 * A private chat file's signed URL, resolved when needed and never stored. It is reused for
 * a little less than its 5-minute life, then resolved again.
 */
export function useAttachmentUrl(path: string | null) {
  const lifetimeMs = (MEDIA_LIMITS.signedGetTtlSec - 60) * 1000;
  return useQuery({
    queryKey: chatKeys.attachment(path ?? ''),
    queryFn: () => chatApi.attachmentUrl(path ?? ''),
    enabled: path !== null,
    staleTime: lifetimeMs,
    gcTime: lifetimeMs,
  });
}
