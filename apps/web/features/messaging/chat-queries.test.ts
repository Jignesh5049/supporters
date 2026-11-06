import type { Conversation, Page } from '@supporters/shared';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChatSocketEvents } from '@/lib/socket/chat-socket';
import { chatApi } from './chat-api';
import { chatKeys, threadMessages } from './chat-cache';
import { CONVERSATION_ID, chatMessage, conversation, messageId } from './chat-fixtures';
import {
  bindChatToCache,
  conversationQueryOptions,
  inboxQueryOptions,
  threadQueryOptions,
} from './chat-queries';

vi.mock('./chat-api', () => ({
  chatApi: { conversations: vi.fn(), messages: vi.fn() },
  attachmentHref: (id: string) => `/v1/attachments/${id}`,
}));

const conversations = vi.mocked(chatApi.conversations);
const messages = vi.mocked(chatApi.messages);

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

afterEach(() => {
  vi.resetAllMocks();
});

describe('inbox and thread queries', () => {
  it('pages the inbox on the cursor, with the search term', async () => {
    conversations
      .mockResolvedValueOnce({ data: [conversation()], nextCursor: 'next' })
      .mockResolvedValueOnce({ data: [], nextCursor: null });
    const qc = client();
    const options = inboxQueryOptions({ q: 'silk', hidden: false });
    await qc.fetchInfiniteQuery({ ...options, pages: 2 });
    expect(conversations.mock.calls).toEqual([
      [{ q: 'silk', hidden: false, cursor: undefined }],
      [{ q: 'silk', hidden: false, cursor: 'next' }],
    ]);
  });

  it('pages a thread back through history on its cursor', async () => {
    messages
      .mockResolvedValueOnce({ data: [chatMessage(3), chatMessage(2)], nextCursor: messageId(2) })
      .mockResolvedValueOnce({ data: [chatMessage(1)], nextCursor: null });
    const qc = client();
    const data = await qc.fetchInfiniteQuery({ ...threadQueryOptions(CONVERSATION_ID), pages: 2 });
    expect(messages.mock.calls).toEqual([
      [CONVERSATION_ID, { cursor: undefined }],
      [CONVERSATION_ID, { cursor: messageId(2) }],
    ]);
    expect(threadMessages(data).map((m) => m.id)).toEqual([3, 2, 1].map(messageId));
  });
});

describe('one conversation', () => {
  const page = (items: Conversation[], nextCursor: string | null = null): Page<Conversation> => ({
    data: items,
    nextCursor,
  });

  it('starts from a cached inbox without a request', () => {
    const qc = client();
    qc.setQueryData(chatKeys.inbox({ q: null, hidden: false }), {
      pages: [page([conversation({ unreadCount: 3 })])],
      pageParams: [undefined],
    });
    const options = conversationQueryOptions(qc, CONVERSATION_ID);
    expect(typeof options.initialData === 'function' && options.initialData()).toMatchObject({
      unreadCount: 3,
    });
  });

  it('walks the inbox, then the hidden threads, to find a linked thread', async () => {
    const other = conversation({ id: '0c000000-0000-4000-8000-000000000009' });
    conversations
      .mockResolvedValueOnce(page([other], 'c1'))
      .mockResolvedValueOnce(page([other]))
      .mockResolvedValueOnce(page([conversation({ hidden: true })]));
    const qc = client();
    const found = await qc.fetchQuery(conversationQueryOptions(qc, CONVERSATION_ID));
    expect(found).toMatchObject({ id: CONVERSATION_ID, hidden: true });
    expect(conversations.mock.calls.map(([query]) => [query?.hidden, query?.cursor])).toEqual([
      [false, undefined],
      [false, 'c1'],
      [true, undefined],
    ]);
  });

  it('answers null for a thread this account is not part of', async () => {
    conversations.mockResolvedValue(page([]));
    const qc = client();
    await expect(qc.fetchQuery(conversationQueryOptions(qc, CONVERSATION_ID))).resolves.toBeNull();
  });
});

describe('socket to cache', () => {
  function fakeChat() {
    const listeners = new Map<string, ((...args: never[]) => void)[]>();
    return {
      on<K extends keyof ChatSocketEvents>(event: K, listener: ChatSocketEvents[K]) {
        listeners.set(event, [...(listeners.get(event) ?? []), listener as never]);
        return () =>
          listeners.set(
            event,
            (listeners.get(event) ?? []).filter((l) => l !== listener),
          );
      },
      fire(event: keyof ChatSocketEvents, ...args: unknown[]) {
        for (const listener of listeners.get(event) ?? [])
          (listener as (...a: unknown[]) => void)(...args);
      },
      count: () => [...listeners.values()].flat().length,
    };
  }

  it('puts live messages in their thread, catches up on reconnect, and unbinds', async () => {
    const qc = client();
    const chat = fakeChat();
    qc.setQueryData(chatKeys.thread(CONVERSATION_ID), {
      pages: [{ data: [chatMessage(1)], nextCursor: null }],
      pageParams: [undefined],
    });
    const fetchMessages = vi.fn(async () => ({ data: [chatMessage(3)], nextCursor: null }));
    const unbind = bindChatToCache(chat, qc, fetchMessages);

    chat.fire('message', chatMessage(2));
    chat.fire('reconnected');
    await vi.waitFor(() =>
      expect(fetchMessages).toHaveBeenCalledWith(CONVERSATION_ID, { after: messageId(2) }),
    );
    await vi.waitFor(() =>
      expect(
        threadMessages(qc.getQueryData(chatKeys.thread(CONVERSATION_ID))).map((m) => m.id),
      ).toEqual([3, 2, 1].map(messageId)),
    );

    unbind();
    expect(chat.count()).toBe(0);
  });

  it('refreshes the enquiry lists when an enquiry or an owner reply arrives', () => {
    const qc = client();
    const chat = fakeChat();
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    bindChatToCache(chat, qc, vi.fn());
    chat.fire('message', chatMessage(1));
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['enquiries'] });
    chat.fire('message', chatMessage(2, { type: 'enquiry' }));
    chat.fire('message', chatMessage(3, { senderSide: 'business' }));
    expect(invalidate.mock.calls.filter(([f]) => f?.queryKey?.[0] === 'enquiries')).toHaveLength(2);
  });
});
