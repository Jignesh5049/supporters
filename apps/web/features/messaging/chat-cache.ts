import type {
  Conversation,
  EnquiryStatus,
  Message,
  MessageReadPayload,
  Page,
} from '@supporters/shared';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';

/**
 * Query keys and the cache updates behind the inbox and threads. Kept free of
 * React so live events, catch-up and optimistic changes are unit-tested on a
 * plain `QueryClient`.
 *
 * - A thread is an infinite query of `GET /conversations/:id/messages` pages,
 *   newest first (page 0 holds the newest messages).
 * - The inbox is an infinite query of `GET /conversations`, latest activity first.
 */
export interface InboxFilter {
  q: string | null;
  hidden: boolean;
}

export const chatKeys = {
  all: ['chat'] as const,
  inboxes: ['chat', 'inbox'] as const,
  inbox: ({ q, hidden }: InboxFilter) => ['chat', 'inbox', { q, hidden }] as const,
  threads: ['chat', 'thread'] as const,
  thread: (conversationId: string) => ['chat', 'thread', conversationId] as const,
  conversation: (conversationId: string) => ['chat', 'conversation', conversationId] as const,
  myEnquiries: ['enquiries', 'mine'] as const,
  businessEnquiries: (status: EnquiryStatus | null) => ['enquiries', 'business', status] as const,
  allBusinessEnquiries: ['enquiries', 'business'] as const,
};

export type ThreadData = InfiniteData<Page<Message>, string | undefined>;
export type InboxData = InfiniteData<Page<Conversation>, string | undefined>;

const byNewest = (a: Message, b: Message) =>
  b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);

/** Adds or replaces a message. New ones go to the newest page, kept in order. */
export function insertMessage(
  data: ThreadData | undefined,
  message: Message,
): ThreadData | undefined {
  if (!data) return data;
  let found = false;
  const pages = data.pages.map((page) => {
    if (!page.data.some((item) => item.id === message.id)) return page;
    found = true;
    return { ...page, data: page.data.map((item) => (item.id === message.id ? message : item)) };
  });
  if (found) return { ...data, pages };
  const [first, ...rest] = pages;
  const newest: Page<Message> = first ?? { data: [], nextCursor: null };
  return {
    ...data,
    pages: [{ ...newest, data: [message, ...newest.data].sort(byNewest) }, ...rest],
  };
}

export function removeMessage(data: ThreadData | undefined, messageId: string) {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data.filter((item) => item.id !== messageId),
    })),
  };
}

/** Every message of a thread, newest first, once each. */
export function threadMessages(data: InfiniteData<Page<Message>, unknown> | undefined): Message[] {
  if (!data) return [];
  const seen = new Set<string>();
  const messages: Message[] = [];
  for (const page of data.pages) {
    for (const message of page.data) {
      if (seen.has(message.id)) continue;
      seen.add(message.id);
      messages.push(message);
    }
  }
  return messages;
}

export function newestMessageId(data: ThreadData | undefined): string | null {
  return threadMessages(data)[0]?.id ?? null;
}

function mapInbox(data: InboxData | undefined, update: (c: Conversation) => Conversation) {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({ ...page, data: page.data.map(update) })),
  };
}

/** Applies `update` to the conversation wherever it is cached (every inbox, its own entry). */
export function updateConversation(
  client: QueryClient,
  conversationId: string,
  update: (conversation: Conversation) => Conversation,
) {
  const apply = (c: Conversation) => (c.id === conversationId ? update(c) : c);
  client.setQueriesData<InboxData>({ queryKey: chatKeys.inboxes }, (data) => mapInbox(data, apply));
  client.setQueryData<Conversation | null>(chatKeys.conversation(conversationId), (c) =>
    c ? update(c) : c,
  );
}

/** Drops a conversation from every inbox (hidden, blocked). */
export function removeFromInboxes(client: QueryClient, conversationId: string) {
  client.setQueriesData<InboxData>({ queryKey: chatKeys.inboxes }, (data) =>
    data
      ? {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            data: page.data.filter((c) => c.id !== conversationId),
          })),
        }
      : data,
  );
}

/** Finds a conversation in any cached inbox. */
export function findInInboxes(client: QueryClient, conversationId: string): Conversation | null {
  for (const [, data] of client.getQueriesData<InboxData>({ queryKey: chatKeys.inboxes })) {
    for (const page of data?.pages ?? []) {
      const match = page.data.find((c) => c.id === conversationId);
      if (match) return match;
    }
  }
  return null;
}

/** Finds a conversation in its own entry or any cached inbox. */
export function findConversation(client: QueryClient, conversationId: string): Conversation | null {
  return (
    client.getQueryData<Conversation | null>(chatKeys.conversation(conversationId)) ??
    findInInboxes(client, conversationId)
  );
}

/** The conversation after a new message: preview, activity time, and unread for the peer's. */
export function withMessage(conversation: Conversation, message: Message): Conversation {
  const isPeers = message.senderSide !== conversation.side;
  const isNewer =
    !conversation.lastMessage || message.createdAt >= conversation.lastMessage.createdAt;
  if (!isNewer) return conversation;
  if (conversation.lastMessage?.id === message.id) return { ...conversation, lastMessage: message };
  return {
    ...conversation,
    lastMessage: message,
    lastMessageAt: message.createdAt,
    unreadCount: isPeers ? conversation.unreadCount + 1 : conversation.unreadCount,
    // A new incoming message unhides the thread (the API does the same).
    hidden: isPeers ? false : conversation.hidden,
  };
}

/** Moves the conversation to the top of every inbox that holds it. Returns whether any did. */
function bumpInInboxes(client: QueryClient, message: Message): boolean {
  let found = false;
  client.setQueriesData<InboxData>({ queryKey: chatKeys.inboxes }, (data) => {
    if (!data) return data;
    let match: Conversation | undefined;
    const pages = data.pages.map((page) => ({
      ...page,
      data: page.data.filter((c) => {
        if (c.id !== message.conversationId) return true;
        match = c;
        return false;
      }),
    }));
    if (!match) return data;
    found = true;
    const [first, ...rest] = pages;
    if (!first) return data;
    return {
      ...data,
      pages: [{ ...first, data: [withMessage(match, message), ...first.data] }, ...rest],
    };
  });
  return found;
}

/** A message from the socket, a REST send or a catch-up page. */
export function receiveMessage(client: QueryClient, message: Message) {
  client.setQueryData<ThreadData>(chatKeys.thread(message.conversationId), (data) =>
    insertMessage(data, message),
  );
  client.setQueryData<Conversation | null>(chatKeys.conversation(message.conversationId), (c) =>
    c ? withMessage(c, message) : c,
  );
  // A thread we have never listed (a new enquiry, say): reload the inbox.
  if (!bumpInInboxes(client, message)) {
    void client.invalidateQueries({ queryKey: chatKeys.inboxes });
  }
}

/** A read receipt: our own (another tab or device) clears unread; the peer's moves the ticks. */
export function receiveRead(client: QueryClient, read: MessageReadPayload) {
  updateConversation(client, read.conversationId, (conversation) => {
    if (read.side === conversation.side) {
      const isNewest = conversation.lastMessage?.id === read.messageId;
      return {
        ...conversation,
        lastReadMessageId: read.messageId,
        unreadCount: isNewest ? 0 : conversation.unreadCount,
      };
    }
    return { ...conversation, peerLastReadMessageId: read.messageId };
  });
}

export type FetchMessages = (
  conversationId: string,
  query: { after: string },
) => Promise<Page<Message>>;

/** Pages fetched per thread when catching up; past that, the thread reloads instead. */
const CATCH_UP_MAX_PAGES = 10;

/**
 * After a reconnect: fetch what each cached thread missed with
 * `?after=<newest id>` (oldest first, `nextCursor` until caught up), then
 * refresh the inbox, whose unread counts and order may have moved.
 */
export async function catchUp(client: QueryClient, fetchMessages: FetchMessages) {
  const threads = client.getQueriesData<ThreadData>({ queryKey: chatKeys.threads });
  await Promise.all(
    threads.map(async ([queryKey, data]) => {
      const conversationId = queryKey[2];
      if (typeof conversationId !== 'string') return;
      let after = newestMessageId(data);
      if (!after) {
        await client.invalidateQueries({ queryKey, exact: true });
        return;
      }
      try {
        for (let page = 0; after && page < CATCH_UP_MAX_PAGES; page += 1) {
          const result = await fetchMessages(conversationId, { after });
          for (const message of result.data) receiveMessage(client, message);
          after = result.nextCursor;
        }
        if (after) await client.invalidateQueries({ queryKey, exact: true });
      } catch {
        await client.invalidateQueries({ queryKey, exact: true });
      }
    }),
  );
  await client.invalidateQueries({ queryKey: chatKeys.inboxes });
}

/** Unread messages across the inbox's loaded threads, for the nav badge. */
export function unreadTotal(data: InfiniteData<Page<Conversation>, unknown> | undefined): number {
  let total = 0;
  for (const page of data?.pages ?? []) {
    for (const conversation of page.data) total += conversation.unreadCount;
  }
  return total;
}
