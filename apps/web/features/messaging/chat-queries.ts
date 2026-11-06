import { type Conversation, type EnquiryStatus, PAGINATION } from '@supporters/shared';
import { type QueryClient, infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import type { ChatSocket } from '@/lib/socket/chat-socket';
import { chatApi } from './chat-api';
import {
  type InboxFilter,
  catchUp,
  chatKeys,
  findConversation,
  findInInboxes,
  receiveMessage,
  receiveRead,
} from './chat-cache';

/**
 * Query options for the inbox, threads and enquiry lists, and the binding
 * between the socket and the cache. No React here, so they are tested on a
 * plain `QueryClient`.
 */

/** Live events keep these fresh; a refetch on focus covers anything missed. */
const CHAT_STALE_MS = 30_000;

export const inboxQueryOptions = (filter: InboxFilter) =>
  infiniteQueryOptions({
    queryKey: chatKeys.inbox(filter),
    queryFn: ({ pageParam }) =>
      chatApi.conversations({
        q: filter.q ?? undefined,
        hidden: filter.hidden,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: CHAT_STALE_MS,
  });

export const threadQueryOptions = (conversationId: string) =>
  infiniteQueryOptions({
    queryKey: chatKeys.thread(conversationId),
    queryFn: ({ pageParam }) => chatApi.messages(conversationId, { cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    // Older history, page by page.
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: Infinity,
  });

/** Inbox pages scanned when a thread is opened by link (50 each, visible then hidden). */
const SCAN_MAX_PAGES = 10;

async function scanInbox(conversationId: string, hidden: boolean): Promise<Conversation | null> {
  let cursor: string | undefined;
  for (let page = 0; page < SCAN_MAX_PAGES; page += 1) {
    const result = await chatApi.conversations({ hidden, cursor, limit: PAGINATION.maxLimit });
    const match = result.data.find((conversation) => conversation.id === conversationId);
    if (match) return match;
    if (!result.nextCursor) return null;
    cursor = result.nextCursor;
  }
  return null;
}

/**
 * One conversation. The API has no `GET /conversations/:id` yet, so this
 * reads it from a cached inbox, else walks the inbox. Null when not found.
 */
export const conversationQueryOptions = (client: QueryClient, conversationId: string) =>
  queryOptions({
    queryKey: chatKeys.conversation(conversationId),
    queryFn: async () =>
      findInInboxes(client, conversationId) ??
      (await scanInbox(conversationId, false)) ??
      (await scanInbox(conversationId, true)),
    initialData: () => findConversation(client, conversationId) ?? undefined,
    staleTime: CHAT_STALE_MS,
  });

export const myEnquiriesQueryOptions = () =>
  infiniteQueryOptions({
    queryKey: chatKeys.myEnquiries,
    queryFn: ({ pageParam }) => chatApi.myEnquiries(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: CHAT_STALE_MS,
  });

export const businessEnquiriesQueryOptions = (status: EnquiryStatus | null) =>
  infiniteQueryOptions({
    queryKey: chatKeys.businessEnquiries(status),
    queryFn: ({ pageParam }) =>
      chatApi.businessEnquiries({ status: status ?? undefined, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: CHAT_STALE_MS,
  });

type ChatEvents = Pick<ChatSocket, 'on'>;

/**
 * Feeds socket events into the cache: new messages into their thread and the
 * inbox, read receipts into the conversations, and a catch-up after every
 * reconnect. An enquiry thread changes the enquiry lists too. Returns the unbind.
 */
export function bindChatToCache(
  chat: ChatEvents,
  client: QueryClient,
  fetchMessages = chatApi.messages,
): () => void {
  const offs = [
    chat.on('message', (message) => {
      receiveMessage(client, message);
      if (message.type === 'enquiry' || message.senderSide === 'business') {
        void client.invalidateQueries({ queryKey: ['enquiries'] });
      }
    }),
    chat.on('read', (read) => receiveRead(client, read)),
    chat.on('reconnected', () => {
      void catchUp(client, fetchMessages);
    }),
  ];
  return () => {
    for (const off of offs) off();
  };
}
