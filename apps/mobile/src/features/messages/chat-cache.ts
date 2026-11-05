import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { Conversation, Message, MessageReadPayload, Page } from '@supporters/shared';
import { chatKeys } from './query-keys';

export type ThreadData = InfiniteData<Page<Message>, string | undefined>;
export type InboxData = InfiniteData<Page<Conversation>, string | undefined>;

const sameMessage = (a: Message, b: Message) => a.id === b.id || a.clientId === b.clientId;

/** Thread pages are newest first. A message already there (same id or clientId) is replaced. */
export function insertMessage(
  data: ThreadData | undefined,
  message: Message,
): ThreadData | undefined {
  if (!data) return data;
  let found = false;
  const pages = data.pages.map((page) => ({
    ...page,
    data: page.data.map((existing) => {
      if (!sameMessage(existing, message)) return existing;
      found = true;
      return message;
    }),
  }));
  if (found) return { ...data, pages };
  const [first, ...rest] = pages;
  if (!first) return { ...data, pages: [{ data: [message], nextCursor: null }] };
  // Keep newest first even when a late message is older than the top one.
  const merged = [...first.data, message].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { ...data, pages: [{ ...first, data: merged }, ...rest] };
}

export function removeMessage(data: ThreadData | undefined, id: string): ThreadData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({ ...page, data: page.data.filter((m) => m.id !== id) })),
  };
}

export function newestMessage(data: ThreadData | undefined): Message | null {
  return data?.pages[0]?.data[0] ?? null;
}

export function flattenThread(data: ThreadData | undefined): Message[] {
  return data?.pages.flatMap((page) => page.data) ?? [];
}

/**
 * Updates an inbox for a new message: last message, unread count (never for my own messages
 * or the thread on screen), and moves the thread to the top. `found` is false when the
 * thread is not in this inbox.
 */
export function applyMessageToInbox(
  data: InboxData | undefined,
  message: Message,
  options: { viewerId: string; isOnScreen: boolean },
): { data: InboxData | undefined; found: boolean } {
  if (!data) return { data, found: false };
  let hit: Conversation | undefined;
  for (const page of data.pages) {
    hit ??= page.data.find((conversation) => conversation.id === message.conversationId);
  }
  if (!hit) return { data, found: false };
  const isMine = message.senderId === options.viewerId;
  const isNew =
    hit.lastMessage?.id !== message.id && hit.lastMessage?.clientId !== message.clientId;
  const countsAsUnread = !isMine && !options.isOnScreen && isNew;
  const updated: Conversation = {
    ...hit,
    lastMessage: message,
    lastMessageAt: message.createdAt,
    hidden: false,
    unreadCount: countsAsUnread ? hit.unreadCount + 1 : hit.unreadCount,
    ...(isMine ? { lastReadMessageId: message.id } : {}),
  };
  const pages = data.pages.map((page) => ({
    ...page,
    data: page.data.filter((conversation) => conversation.id !== message.conversationId),
  }));
  const [first, ...rest] = pages;
  return {
    data: { ...data, pages: [{ ...first!, data: [updated, ...first!.data] }, ...rest] },
    found: true,
  };
}

/** A read receipt: mine clears the unread count; theirs moves the "read" ticks. */
export function applyReadToConversation(
  conversation: Conversation,
  read: MessageReadPayload,
  viewerId: string,
): Conversation {
  if (conversation.id !== read.conversationId) return conversation;
  if (read.readerId === viewerId) {
    return { ...conversation, lastReadMessageId: read.messageId, unreadCount: 0 };
  }
  return { ...conversation, peerLastReadMessageId: read.messageId };
}

export function mapInbox(
  data: InboxData | undefined,
  update: (conversation: Conversation) => Conversation | null,
): InboxData | undefined {
  if (!data) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data.flatMap((conversation) => {
        const next = update(conversation);
        return next ? [next] : [];
      }),
    })),
  };
}

/**
 * Applies a change to every cached copy of a conversation (inbox pages and detail). Returning
 * null drops it from the inbox lists (hidden, blocked).
 */
export function patchConversation(
  queryClient: QueryClient,
  id: string,
  update: (conversation: Conversation) => Conversation | null,
) {
  queryClient.setQueriesData<InboxData>({ queryKey: chatKeys.inboxes }, (data) =>
    mapInbox(data, (conversation) =>
      conversation.id === id ? update(conversation) : conversation,
    ),
  );
  queryClient.setQueryData<Conversation | null>(chatKeys.conversation(id), (conversation) =>
    conversation ? (update(conversation) ?? conversation) : conversation,
  );
}

/** Finds a conversation in the detail cache or any cached inbox page. */
export function findCachedConversation(queryClient: QueryClient, id: string): Conversation | null {
  const detail = queryClient.getQueryData<Conversation | null>(chatKeys.conversation(id));
  if (detail) return detail;
  for (const [, data] of queryClient.getQueriesData<InboxData>({ queryKey: chatKeys.inboxes })) {
    for (const page of data?.pages ?? []) {
      const hit = page.data.find((conversation) => conversation.id === id);
      if (hit) return hit;
    }
  }
  return null;
}

/**
 * Which messages the other end has read: everything at or before their read pointer.
 * `messages` is newest first. A pointer older than what is loaded marks nothing.
 */
export function readMessageIds(
  messages: Message[],
  peerLastReadMessageId: string | null,
): Set<string> {
  const read = new Set<string>();
  if (!peerLastReadMessageId) return read;
  let reached = false;
  for (const message of messages) {
    if (message.id === peerLastReadMessageId) reached = true;
    if (reached) read.add(message.id);
  }
  return read;
}

/**
 * The other end's account id, needed to block them. A buyer only learns the owner's id from
 * a message the business sent: the API has no `peerUserId` on conversations yet.
 */
export function peerUserId(conversation: Conversation, messages: Message[]): string | null {
  if (conversation.side === 'business') return conversation.user.id;
  const fromBusiness =
    messages.find((m) => m.senderSide === 'business') ??
    (conversation.lastMessage?.senderSide === 'business' ? conversation.lastMessage : null);
  return fromBusiness?.senderId ?? null;
}

/** The name and picture of the other end of a thread. */
export function counterpart(conversation: Conversation) {
  if (conversation.side === 'user') {
    return {
      name: conversation.business.name,
      imageUrl: conversation.business.logo?.url ?? null,
      isVerified: conversation.business.isVerified,
      subtitle: conversation.business.city.name,
    };
  }
  return {
    name: conversation.user.name,
    imageUrl: null,
    isVerified: false,
    subtitle: `Buyer · ${conversation.business.name}`,
  };
}
