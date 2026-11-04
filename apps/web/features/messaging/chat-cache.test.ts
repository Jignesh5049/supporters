import type { Conversation, Message, Page } from '@supporters/shared';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import {
  type InboxData,
  type ThreadData,
  catchUp,
  chatKeys,
  insertMessage,
  receiveMessage,
  receiveRead,
  removeFromInboxes,
  removeMessage,
  threadMessages,
  unreadTotal,
  withMessage,
} from './chat-cache';
import { CONVERSATION_ID, OWNER_ID, chatMessage, conversation, messageId } from './chat-fixtures';

const OTHER_ID = '0c000000-0000-4000-8000-000000000002';

const thread = (...pages: Message[][]): ThreadData => ({
  pages: pages.map((data, index) => ({
    data,
    nextCursor: index < pages.length - 1 ? `cursor-${index}` : null,
  })),
  pageParams: pages.map((_, index) => (index === 0 ? undefined : `cursor-${index - 1}`)),
});

const inbox = (...conversations: Conversation[]): InboxData => ({
  pages: [{ data: conversations, nextCursor: null }],
  pageParams: [undefined],
});

const ids = (messages: Message[]) => messages.map((m) => m.id);

function client() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe('thread pages', () => {
  it('puts a new message at the top of the newest page, in order', () => {
    const data = thread([chatMessage(3), chatMessage(2)], [chatMessage(1)]);
    const next = insertMessage(data, chatMessage(4));
    expect(ids(threadMessages(next))).toEqual([4, 3, 2, 1].map(messageId));
    // A late arrival that is older than the newest still lands in order.
    const late = insertMessage(data, {
      ...chatMessage(2),
      id: messageId(9),
      createdAt: chatMessage(2).createdAt.replace('02:00', '02:30'),
    });
    expect(threadMessages(late)[0]?.id).toBe(messageId(3));
  });

  it('replaces a message it already holds instead of adding it twice', () => {
    const data = thread([chatMessage(2)], [chatMessage(1)]);
    const next = insertMessage(data, { ...chatMessage(1), body: 'Edited copy' });
    expect(threadMessages(next)).toHaveLength(2);
    expect(threadMessages(next)[1]?.body).toBe('Edited copy');
  });

  it('leaves a thread that was never loaded alone', () => {
    expect(insertMessage(undefined, chatMessage(1))).toBeUndefined();
  });

  it('removes a message deleted for me from any page', () => {
    const data = thread([chatMessage(2)], [chatMessage(1)]);
    expect(ids(threadMessages(removeMessage(data, messageId(1))))).toEqual([messageId(2)]);
  });
});

describe('conversation updates', () => {
  it('counts unread only for the other end’s messages, and unhides the thread', () => {
    const base = conversation({ hidden: true, unreadCount: 1 });
    const fromOwner = withMessage(base, chatMessage(1, { senderSide: 'business' }));
    expect(fromOwner).toMatchObject({ unreadCount: 2, hidden: false });
    expect(fromOwner.lastMessage?.id).toBe(messageId(1));
    const mine = withMessage(base, chatMessage(2));
    expect(mine).toMatchObject({ unreadCount: 1, hidden: true });
  });

  it('ignores an older message and does not count a repeat', () => {
    const base = conversation({
      lastMessage: chatMessage(5),
      lastMessageAt: chatMessage(5).createdAt,
    });
    expect(withMessage(base, chatMessage(4, { senderSide: 'business' }))).toBe(base);
    const repeat = withMessage(base, chatMessage(5));
    expect(repeat.unreadCount).toBe(0);
  });

  it('moves the conversation to the top of every inbox and into its thread', () => {
    const qc = client();
    const other = conversation({ id: OTHER_ID });
    qc.setQueryData(chatKeys.inbox({ q: null, hidden: false }), inbox(other, conversation()));
    qc.setQueryData(chatKeys.inbox({ q: 'sur', hidden: false }), inbox(conversation()));
    qc.setQueryData(chatKeys.thread(CONVERSATION_ID), thread([]));

    receiveMessage(qc, chatMessage(1, { senderSide: 'business' }));

    const main = qc.getQueryData<InboxData>(chatKeys.inbox({ q: null, hidden: false }));
    expect(main?.pages[0]?.data.map((c) => c.id)).toEqual([CONVERSATION_ID, OTHER_ID]);
    expect(main?.pages[0]?.data[0]?.unreadCount).toBe(1);
    const searched = qc.getQueryData<InboxData>(chatKeys.inbox({ q: 'sur', hidden: false }));
    expect(searched?.pages[0]?.data[0]?.unreadCount).toBe(1);
    expect(threadMessages(qc.getQueryData(chatKeys.thread(CONVERSATION_ID)))).toHaveLength(1);
    expect(unreadTotal(main)).toBe(1);
  });

  it('reloads the inbox for a thread it has never listed', () => {
    const qc = client();
    qc.setQueryData(chatKeys.inbox({ q: null, hidden: false }), inbox());
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    receiveMessage(qc, chatMessage(1));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: chatKeys.inboxes });
  });

  it('applies read receipts: mine clear unread, the peer’s move the ticks', () => {
    const qc = client();
    const latest = chatMessage(2, { senderSide: 'business' });
    qc.setQueryData(
      chatKeys.inbox({ q: null, hidden: false }),
      inbox(conversation({ lastMessage: latest, unreadCount: 2 })),
    );
    const read = {
      conversationId: CONVERSATION_ID,
      readerId: OWNER_ID,
      messageId: messageId(1),
      readAt: '2026-11-04T10:05:00.000Z',
    };
    receiveRead(qc, { ...read, side: 'business' });
    const afterPeer = qc.getQueryData<InboxData>(chatKeys.inbox({ q: null, hidden: false }));
    expect(afterPeer?.pages[0]?.data[0]).toMatchObject({
      peerLastReadMessageId: messageId(1),
      unreadCount: 2,
    });

    // Read from another tab, up to the newest message.
    receiveRead(qc, { ...read, side: 'user', messageId: messageId(2) });
    const afterMine = qc.getQueryData<InboxData>(chatKeys.inbox({ q: null, hidden: false }));
    expect(afterMine?.pages[0]?.data[0]).toMatchObject({
      lastReadMessageId: messageId(2),
      unreadCount: 0,
    });
  });

  it('takes a hidden or blocked thread out of every inbox', () => {
    const qc = client();
    qc.setQueryData(chatKeys.inbox({ q: null, hidden: false }), inbox(conversation()));
    removeFromInboxes(qc, CONVERSATION_ID);
    expect(
      qc.getQueryData<InboxData>(chatKeys.inbox({ q: null, hidden: false }))?.pages[0]?.data,
    ).toEqual([]);
  });
});

describe('catch-up after a reconnect', () => {
  it('fetches ?after=<newest id> until caught up, then refreshes the inbox', async () => {
    const qc = client();
    qc.setQueryData(chatKeys.thread(CONVERSATION_ID), thread([chatMessage(2), chatMessage(1)]));
    const pages: Record<string, Page<Message>> = {
      [messageId(2)]: { data: [chatMessage(3), chatMessage(4)], nextCursor: messageId(4) },
      [messageId(4)]: { data: [chatMessage(5)], nextCursor: null },
    };
    const fetchMessages = vi.fn(async (_id: string, { after }: { after: string }) => pages[after]!);
    const invalidate = vi.spyOn(qc, 'invalidateQueries');

    await catchUp(qc, fetchMessages);

    expect(fetchMessages.mock.calls.map(([, query]) => query.after)).toEqual([
      messageId(2),
      messageId(4),
    ]);
    expect(ids(threadMessages(qc.getQueryData(chatKeys.thread(CONVERSATION_ID))))).toEqual(
      [5, 4, 3, 2, 1].map(messageId),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: chatKeys.inboxes });
  });

  it('dedupes messages that arrived live while catching up', async () => {
    const qc = client();
    qc.setQueryData(chatKeys.thread(CONVERSATION_ID), thread([chatMessage(1)]));
    receiveMessage(qc, chatMessage(2));
    await catchUp(qc, async () => ({ data: [chatMessage(2), chatMessage(3)], nextCursor: null }));
    expect(ids(threadMessages(qc.getQueryData(chatKeys.thread(CONVERSATION_ID))))).toEqual(
      [3, 2, 1].map(messageId),
    );
  });

  it('reloads a thread instead when catching up fails or the thread was empty', async () => {
    const qc = client();
    qc.setQueryData(chatKeys.thread(CONVERSATION_ID), thread([chatMessage(1)]));
    qc.setQueryData(chatKeys.thread(OTHER_ID), thread([]));
    const invalidate = vi.spyOn(qc, 'invalidateQueries');
    await catchUp(qc, async () => {
      throw new Error('offline');
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: chatKeys.thread(CONVERSATION_ID),
      exact: true,
    });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: chatKeys.thread(OTHER_ID), exact: true });
  });
});
