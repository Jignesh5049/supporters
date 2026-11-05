import { QueryClient } from '@tanstack/react-query';
import { uuid } from '../social/fixtures';
import {
  applyMessageToInbox,
  applyReadToConversation,
  findCachedConversation,
  insertMessage,
  patchConversation,
  peerUserId,
  readMessageIds,
  removeMessage,
  type InboxData,
  type ThreadData,
} from './chat-cache';
import { CONVERSATION, makeConversation, makeMessage, OWNER, VIEWER } from './fixtures';
import { buildThreadItems } from './hooks/use-thread';
import type { LocalMessage } from './pending-store';
import { chatKeys } from './query-keys';
import { applyIncomingMessage, catchUpThread, CATCH_UP_MAX_PAGES } from './realtime-sync';

jest.mock('../../lib/socket', () => ({ realtime: {} }));
jest.mock('../../lib/api', () => ({ chatApi: {} }));

const thread = (...pages: ReturnType<typeof makeMessage>[][]): ThreadData => ({
  pages: pages.map((data, i) => ({ data, nextCursor: i < pages.length - 1 ? `c${i}` : null })),
  pageParams: pages.map((_, i) => (i === 0 ? undefined : `c${i - 1}`)),
});

const inbox = (...conversations: ReturnType<typeof makeConversation>[]): InboxData => ({
  pages: [{ data: conversations, nextCursor: null }],
  pageParams: [undefined],
});

describe('insertMessage', () => {
  it('puts a new message at the top, newest first', () => {
    const data = insertMessage(thread([makeMessage(2), makeMessage(1)]), makeMessage(3));
    expect(data?.pages[0]?.data.map((m) => m.body)).toEqual([
      'message 3',
      'message 2',
      'message 1',
    ]);
  });

  it('replaces a message with the same id or clientId instead of adding it twice', () => {
    const start = thread([makeMessage(2), makeMessage(1)]);
    const sameId = insertMessage(start, makeMessage(2, { body: 'edited' }));
    expect(sameId?.pages[0]?.data.map((m) => m.body)).toEqual(['edited', 'message 1']);

    const sameClient = insertMessage(start, makeMessage(9, { clientId: makeMessage(1).clientId }));
    expect(sameClient?.pages[0]?.data).toHaveLength(2);
  });

  it('keeps order when a late message is older than the newest', () => {
    const data = insertMessage(thread([makeMessage(5), makeMessage(1)]), makeMessage(3));
    expect(data?.pages[0]?.data.map((m) => m.body)).toEqual([
      'message 5',
      'message 3',
      'message 1',
    ]);
  });

  it('leaves an uncached thread alone', () => {
    expect(insertMessage(undefined, makeMessage(1))).toBeUndefined();
  });

  it('deletes for me', () => {
    const data = removeMessage(thread([makeMessage(2)], [makeMessage(1)]), makeMessage(1).id);
    expect(data?.pages[1]?.data).toEqual([]);
  });
});

describe('applyMessageToInbox', () => {
  const other = makeConversation({ id: uuid(101) });

  it('moves the thread to the top with the new last message and one more unread', () => {
    const result = applyMessageToInbox(inbox(other, makeConversation()), makeMessage(1), {
      viewerId: VIEWER,
      isOnScreen: false,
    });
    const first = result.data?.pages[0]?.data[0];
    expect(result.found).toBe(true);
    expect(first?.id).toBe(CONVERSATION);
    expect(first?.lastMessage?.id).toBe(makeMessage(1).id);
    expect(first?.unreadCount).toBe(1);
  });

  it('does not count my own messages, the thread on screen, or a repeat', () => {
    const mine = makeMessage(1, { senderId: VIEWER, senderSide: 'user' });
    expect(
      applyMessageToInbox(inbox(makeConversation()), mine, { viewerId: VIEWER, isOnScreen: false })
        .data?.pages[0]?.data[0]?.unreadCount,
    ).toBe(0);
    expect(
      applyMessageToInbox(inbox(makeConversation()), makeMessage(1), {
        viewerId: VIEWER,
        isOnScreen: true,
      }).data?.pages[0]?.data[0]?.unreadCount,
    ).toBe(0);
    const seen = makeConversation({ lastMessage: makeMessage(1), unreadCount: 1 });
    expect(
      applyMessageToInbox(inbox(seen), makeMessage(1), { viewerId: VIEWER, isOnScreen: false }).data
        ?.pages[0]?.data[0]?.unreadCount,
    ).toBe(1);
  });

  it('reports an unknown thread', () => {
    expect(
      applyMessageToInbox(inbox(other), makeMessage(1), { viewerId: VIEWER, isOnScreen: false })
        .found,
    ).toBe(false);
  });
});

describe('read receipts', () => {
  const base = makeConversation({ unreadCount: 3 });
  const read = (readerId: string) => ({
    conversationId: CONVERSATION,
    side: 'user' as const,
    readerId,
    messageId: makeMessage(2).id,
    readAt: '2026-11-04T10:10:00.000Z',
  });

  it('clears my unread count when I read on another device', () => {
    expect(applyReadToConversation(base, read(VIEWER), VIEWER)).toMatchObject({
      unreadCount: 0,
      lastReadMessageId: makeMessage(2).id,
    });
  });

  it('moves the read ticks when the other end reads', () => {
    expect(applyReadToConversation(base, read(OWNER), VIEWER)).toMatchObject({
      unreadCount: 3,
      peerLastReadMessageId: makeMessage(2).id,
    });
  });

  it('marks everything up to the pointer as read', () => {
    const messages = [makeMessage(3), makeMessage(2), makeMessage(1)];
    expect([...readMessageIds(messages, makeMessage(2).id)]).toEqual([
      makeMessage(2).id,
      makeMessage(1).id,
    ]);
    expect(readMessageIds(messages, null).size).toBe(0);
  });
});

describe('peerUserId', () => {
  it('is the buyer for the business side', () => {
    expect(peerUserId(makeConversation({ side: 'business' }), [])).toBe(VIEWER);
  });

  it('is the owner once the business has sent a message, else unknown', () => {
    expect(peerUserId(makeConversation(), [makeMessage(1)])).toBe(OWNER);
    const mine = makeMessage(1, { senderId: VIEWER, senderSide: 'user' });
    expect(peerUserId(makeConversation(), [mine])).toBeNull();
  });
});

describe('cache across queries', () => {
  it('patches inbox pages and the detail copy, and finds conversations in either', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    queryClient.setQueryData(chatKeys.inbox(VIEWER, '', false), inbox(makeConversation()));
    patchConversation(queryClient, CONVERSATION, (c) => ({ ...c, muted: true }));
    expect(findCachedConversation(queryClient, CONVERSATION)?.muted).toBe(true);
    expect(findCachedConversation(queryClient, uuid(999))).toBeNull();
  });

  it('applies a live message to its thread and inbox', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    queryClient.setQueryData(chatKeys.thread(CONVERSATION), thread([makeMessage(1)]));
    queryClient.setQueryData(chatKeys.inbox(VIEWER, '', false), inbox(makeConversation()));
    applyIncomingMessage(queryClient, makeMessage(2), VIEWER);
    expect(
      queryClient.getQueryData<ThreadData>(chatKeys.thread(CONVERSATION))?.pages[0]?.data,
    ).toHaveLength(2);
    expect(
      queryClient.getQueryData<InboxData>(chatKeys.inbox(VIEWER, '', false))?.pages[0]?.data[0]
        ?.unreadCount,
    ).toBe(1);
  });
});

describe('catchUpThread', () => {
  it('loads what was missed after the newest cached message, page by page', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    queryClient.setQueryData(chatKeys.thread(CONVERSATION), thread([makeMessage(1)]));
    const fetchAfter = jest
      .fn()
      .mockResolvedValueOnce({
        data: [makeMessage(2), makeMessage(3)],
        nextCursor: makeMessage(3).id,
      })
      .mockResolvedValueOnce({ data: [makeMessage(4)], nextCursor: null });

    await catchUpThread(queryClient, CONVERSATION, fetchAfter, VIEWER);

    expect(fetchAfter.mock.calls).toEqual([
      [CONVERSATION, makeMessage(1).id],
      [CONVERSATION, makeMessage(3).id],
    ]);
    expect(
      queryClient
        .getQueryData<ThreadData>(chatKeys.thread(CONVERSATION))
        ?.pages[0]?.data.map((m) => m.body),
    ).toEqual(['message 4', 'message 3', 'message 2', 'message 1']);
  });

  it('reloads the thread from the top after a long gap', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    queryClient.setQueryData(chatKeys.thread(CONVERSATION), thread([makeMessage(1)]));
    const reset = jest.spyOn(queryClient, 'resetQueries');
    const fetchAfter = jest.fn(async () => ({ data: [], nextCursor: 'more' }));

    await catchUpThread(queryClient, CONVERSATION, fetchAfter, VIEWER);

    expect(fetchAfter).toHaveBeenCalledTimes(CATCH_UP_MAX_PAGES);
    expect(reset).toHaveBeenCalledWith({ queryKey: chatKeys.thread(CONVERSATION) });
  });
});

describe('buildThreadItems', () => {
  const local = (n: number): LocalMessage => ({
    item: {
      clientId: uuid(5000 + n),
      conversationId: CONVERSATION,
      userId: VIEWER,
      draft: { type: 'text', body: `pending ${n}` },
      createdAt: '2026-11-04T11:00:00.000Z',
    },
    status: 'sending',
  });

  it('shows pending messages above the history until the server copy arrives', () => {
    const items = buildThreadItems([makeMessage(1)], [local(7)], {
      viewerId: VIEWER,
      peerLastReadMessageId: null,
    });
    expect(items.map((item) => item.kind)).toEqual(['local', 'message']);

    // Same clientId as a delivered message: shown once.
    const delivered = buildThreadItems([makeMessage(7)], [local(7)], {
      viewerId: VIEWER,
      peerLastReadMessageId: null,
    });
    expect(delivered.map((item) => item.kind)).toEqual(['message']);
  });

  it('marks my messages and their read state', () => {
    const mine = makeMessage(1, { senderId: VIEWER, senderSide: 'user' });
    const [item] = buildThreadItems([mine], [], {
      viewerId: VIEWER,
      peerLastReadMessageId: mine.id,
    });
    expect(item).toMatchObject({ kind: 'message', isMine: true, isRead: true });
  });
});
