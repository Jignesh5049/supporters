import type { Message, SendMessageInput } from '@supporters/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api/errors';
import { type ChatSocketDeps, type SocketLike, createChatSocket } from './chat-socket';

const CONVERSATION = '11111111-1111-4111-8111-111111111111';
const OTHER_CONVERSATION = '22222222-2222-4222-8222-222222222222';
const SERVER_ID = '33333333-3333-4333-8333-333333333333';
const CREATED_AT = '2026-11-04T10:00:00.000Z';
const TEXT: SendMessageInput = { type: 'text', body: 'Hello', attachmentIds: [] };

type Ack = unknown | ((payload: unknown) => unknown | Promise<unknown>);

/** A Socket.IO stand-in: tests drive server events and answer acks. */
class FakeSocket implements SocketLike {
  connected = false;
  connectCalls = 0;
  readonly emitted: { event: string; payload: unknown }[] = [];
  readonly acks = new Map<string, Ack>();
  private readonly handlers = new Map<string, ((...args: unknown[]) => void)[]>();

  connect() {
    this.connectCalls += 1;
  }
  disconnect() {
    this.connected = false;
    this.fire('disconnect', 'io client disconnect');
  }
  on(event: string, listener: (...args: unknown[]) => void) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), listener]);
  }
  emit(event: string, payload: unknown) {
    this.emitted.push({ event, payload });
  }
  timeout() {
    return {
      emitWithAck: async (event: string, payload: unknown) => {
        this.emitted.push({ event, payload });
        const ack = this.acks.get(event);
        if (ack === undefined) throw new Error('operation has timed out');
        return typeof ack === 'function' ? (ack as (p: unknown) => unknown)(payload) : ack;
      },
    };
  }

  /** Server side. */
  fire(event: string, ...args: unknown[]) {
    for (const handler of this.handlers.get(event) ?? []) handler(...args);
  }
  open() {
    this.connected = true;
    this.fire('connect');
  }
  drop() {
    this.connected = false;
    this.fire('disconnect', 'transport close');
  }
  sent(event: string) {
    return this.emitted.filter((entry) => entry.event === event).map((entry) => entry.payload);
  }
}

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: SERVER_ID,
    conversationId: CONVERSATION,
    senderSide: 'user',
    senderId: '44444444-4444-4444-8444-444444444444',
    clientId: '66666666-6666-4666-8666-666666666666',
    type: 'text',
    body: 'Hello',
    attachments: [],
    listing: null,
    enquiry: null,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

let ids = 0;

function setup(overrides: Partial<ChatSocketDeps> = {}) {
  const fake = new FakeSocket();
  const deps = {
    createSocket: vi.fn(() => fake),
    refresh: vi.fn(async () => true),
    onSessionExpired: vi.fn(),
    sendRest: vi.fn(async (_conversationId: string, clientId: string) =>
      message({ clientId, id: '55555555-5555-4555-8555-555555555555' }),
    ),
    markReadRest: vi.fn(async () => ({ lastReadMessageId: SERVER_ID })),
    newClientId: () => `00000000-0000-4000-8000-${String((ids += 1)).padStart(12, '0')}`,
    now: () => Date.parse(CREATED_AT),
    ...overrides,
  } satisfies ChatSocketDeps;
  const chat = createChatSocket(deps);
  return { chat, fake, deps };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  ids = 0;
});
afterEach(() => {
  vi.useRealTimers();
});

describe('connection', () => {
  it('opens one socket per tab however often start() is called', () => {
    const { chat, deps, fake } = setup();
    chat.start();
    chat.start();
    expect(deps.createSocket).toHaveBeenCalledTimes(1);
    expect(fake.connectCalls).toBe(1);
    expect(chat.status).toBe('connecting');
    fake.open();
    expect(chat.status).toBe('connected');
  });

  it('refreshes and reconnects when the server ends the socket with token_expired', async () => {
    const { chat, deps, fake } = setup();
    chat.start();
    fake.open();
    fake.fire('auth:expired', { reason: 'token_expired' });
    fake.fire('disconnect', 'io server disconnect');
    expect(chat.status).toBe('reconnecting');
    await flush();
    expect(deps.refresh).toHaveBeenCalledTimes(1);
    expect(fake.connectCalls).toBe(2);
    expect(deps.onSessionExpired).not.toHaveBeenCalled();
  });

  it('sends the user to login when the refresh after token_expired fails', async () => {
    const { chat, deps, fake } = setup({ refresh: vi.fn(async () => false) });
    chat.start();
    fake.open();
    fake.fire('auth:expired', { reason: 'token_expired' });
    await flush();
    expect(deps.onSessionExpired).toHaveBeenCalledTimes(1);
    expect(fake.connectCalls).toBe(1);
  });

  it('sends the user to login at once when the session was revoked', async () => {
    const { chat, deps, fake } = setup();
    chat.start();
    fake.open();
    fake.fire('auth:expired', { reason: 'session_revoked' });
    await flush();
    expect(deps.refresh).not.toHaveBeenCalled();
    expect(deps.onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('refreshes once for a refused handshake, and never loops', async () => {
    const { chat, deps, fake } = setup();
    chat.start();
    fake.fire('connect_error', new Error('unauthorized'));
    await flush();
    expect(deps.refresh).toHaveBeenCalledTimes(1);
    expect(fake.connectCalls).toBe(2);

    // The fresh cookie is refused too: stop and sign in again.
    fake.fire('connect_error', new Error('unauthorized'));
    await flush();
    expect(deps.refresh).toHaveBeenCalledTimes(1);
    expect(fake.connectCalls).toBe(2);
    expect(deps.onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('allows a new refresh after a successful connect', async () => {
    const { chat, deps, fake } = setup();
    chat.start();
    fake.fire('connect_error', new Error('unauthorized'));
    await flush();
    fake.open();
    fake.drop();
    fake.fire('connect_error', new Error('unauthorized'));
    await flush();
    expect(deps.refresh).toHaveBeenCalledTimes(2);
    expect(deps.onSessionExpired).not.toHaveBeenCalled();
  });

  it('gives up on the socket for a wrong origin or too many tabs, and keeps REST', async () => {
    const { chat, deps, fake } = setup();
    chat.start();
    fake.fire('connect_error', new Error('too_many_connections'));
    expect(chat.status).toBe('unavailable');
    chat.send(CONVERSATION, TEXT);
    await flush();
    expect(deps.sendRest).toHaveBeenCalledTimes(1);
  });

  it('announces reconnected only after a drop, not on the first connect', () => {
    const { chat, fake } = setup();
    const reconnected = vi.fn();
    chat.on('reconnected', reconnected);
    chat.start();
    fake.open();
    expect(reconnected).not.toHaveBeenCalled();
    fake.drop();
    expect(chat.status).toBe('reconnecting');
    fake.open();
    expect(reconnected).toHaveBeenCalledTimes(1);
  });

  it('drops malformed server payloads', () => {
    const { chat, fake } = setup();
    const received = vi.fn();
    chat.on('message', received);
    chat.start();
    fake.open();
    fake.fire('message:new', { id: 'not-a-message' });
    fake.fire('message:new', message());
    expect(received).toHaveBeenCalledTimes(1);
  });

  it('forgets unsent messages at sign-out', async () => {
    const { chat, fake, deps } = setup({
      sendRest: vi.fn(async () => {
        throw new ApiError({ status: 0, code: 'NETWORK_ERROR', title: 'Network error' });
      }),
    });
    chat.start();
    chat.send(CONVERSATION, TEXT);
    await flush();
    expect(chat.pending()).toHaveLength(1);
    chat.stop();
    expect(chat.pending()).toHaveLength(0);
    expect(chat.status).toBe('idle');
    expect(deps.onSessionExpired).not.toHaveBeenCalled();
    expect(fake.connected).toBe(false);
  });
});

describe('sending', () => {
  it('sends over the socket with a clientId and marks the message sent on ack', async () => {
    const { chat, fake, deps } = setup();
    fake.acks.set('message:send', { ok: true, id: SERVER_ID, createdAt: CREATED_AT });
    chat.start();
    fake.open();
    const clientId = chat.send(CONVERSATION, TEXT);
    await flush();
    expect(fake.sent('message:send')).toEqual([
      { conversationId: CONVERSATION, clientId, type: 'text', body: 'Hello', attachmentIds: [] },
    ]);
    expect(chat.pending()).toMatchObject([{ clientId, status: 'sent', id: SERVER_ID }]);
    expect(deps.sendRest).not.toHaveBeenCalled();
  });

  it('drops the pending copy when the echo of our own message arrives', async () => {
    const { chat, fake } = setup();
    fake.acks.set('message:send', { ok: true, id: SERVER_ID, createdAt: CREATED_AT });
    const received = vi.fn();
    chat.on('message', received);
    chat.start();
    fake.open();
    const clientId = chat.send(CONVERSATION, TEXT);
    fake.fire('message:new', message({ clientId }));
    await flush();
    expect(chat.pending()).toEqual([]);
    expect(received).toHaveBeenCalledWith(expect.objectContaining({ clientId }));
  });

  it('falls back to REST with the same clientId when no ack arrives', async () => {
    const { chat, fake, deps } = setup();
    const received = vi.fn();
    chat.on('message', received);
    chat.start();
    fake.open();
    const clientId = chat.send(CONVERSATION, TEXT);
    await flush();
    expect(fake.sent('message:send')).toHaveLength(1);
    expect(deps.sendRest).toHaveBeenCalledWith(CONVERSATION, clientId, TEXT);
    // The REST answer is delivered like a socket message, and the outbox is empty.
    expect(received).toHaveBeenCalledWith(expect.objectContaining({ clientId }));
    expect(chat.pending()).toEqual([]);
  });

  it('sends over REST while the socket is down', async () => {
    const { chat, fake, deps } = setup();
    chat.start();
    chat.send(CONVERSATION, TEXT);
    await flush();
    expect(fake.sent('message:send')).toHaveLength(0);
    expect(deps.sendRest).toHaveBeenCalledTimes(1);
  });

  it('queues while offline and sends on reconnect with the same clientId', async () => {
    let online = false;
    const sendRest = vi.fn(async (_c: string, clientId: string) => {
      if (!online) throw new ApiError({ status: 0, code: 'NETWORK_ERROR', title: 'offline' });
      return message({ clientId });
    });
    const { chat, fake } = setup({ sendRest });
    chat.start();
    const first = chat.send(CONVERSATION, TEXT);
    const second = chat.send(OTHER_CONVERSATION, { ...TEXT, body: 'Second' });
    await flush();
    expect(chat.pending().map((p) => p.status)).toEqual(['queued', 'queued']);

    online = true;
    fake.acks.set('message:send', (payload: unknown) => ({
      ok: true,
      id: SERVER_ID,
      createdAt: CREATED_AT,
      echo: payload,
    }));
    fake.open();
    await flush();
    const clientIds = fake
      .sent('message:send')
      .map((payload) => (payload as { clientId: string }).clientId);
    expect(clientIds).toEqual([first, second]);
    expect(chat.pending().map((p) => p.status)).toEqual(['sent', 'sent']);
  });

  it('marks the message failed on a refused ack, and retry keeps its clientId', async () => {
    const { chat, fake, deps } = setup();
    fake.acks.set('message:send', { ok: false, code: 'BLOCKED', message: 'Blocked' });
    chat.start();
    fake.open();
    const clientId = chat.send(CONVERSATION, TEXT);
    await flush();
    expect(chat.pending()).toMatchObject([
      { clientId, status: 'failed', error: { code: 'BLOCKED' } },
    ]);
    expect(deps.sendRest).not.toHaveBeenCalled();

    fake.acks.set('message:send', { ok: true, id: SERVER_ID, createdAt: CREATED_AT });
    chat.retry(clientId);
    await flush();
    const sends = fake.sent('message:send') as { clientId: string }[];
    expect(sends.map((s) => s.clientId)).toEqual([clientId, clientId]);
    expect(chat.pending()).toMatchObject([{ clientId, status: 'sent' }]);
  });

  it('keeps Retry-After from a rate-limited REST send', async () => {
    const { chat } = setup({
      sendRest: vi.fn(async () => {
        throw new ApiError({
          status: 429,
          code: 'RATE_LIMITED',
          title: 'Slow down',
          retryAfter: 7,
        });
      }),
    });
    chat.start();
    chat.send(CONVERSATION, TEXT);
    await flush();
    expect(chat.pending()).toMatchObject([
      { status: 'failed', error: { code: 'RATE_LIMITED', retryAfter: 7 } },
    ]);
  });

  it('settle() removes sent copies once the cache has them, and only those', async () => {
    const { chat, fake } = setup();
    fake.acks.set('message:send', { ok: true, id: SERVER_ID, createdAt: CREATED_AT });
    chat.start();
    fake.open();
    const sent = chat.send(CONVERSATION, TEXT);
    await flush();
    fake.acks.set('message:send', { ok: false, code: 'BLOCKED', message: 'Blocked' });
    const failed = chat.send(CONVERSATION, TEXT);
    await flush();
    chat.settle([sent, failed]);
    expect(chat.pending().map((p) => p.clientId)).toEqual([failed]);
  });
});

describe('typing, reads and presence', () => {
  it('throttles typing to one per 3 s per thread, and stops only after a start', () => {
    let clock = 0;
    const { chat, fake } = setup({ now: () => clock });
    chat.start();
    fake.open();
    chat.typing(CONVERSATION, false);
    chat.typing(CONVERSATION, true);
    clock = 1_000;
    chat.typing(CONVERSATION, true);
    chat.typing(OTHER_CONVERSATION, true);
    clock = 3_000;
    chat.typing(CONVERSATION, true);
    chat.typing(CONVERSATION, false);
    chat.typing(CONVERSATION, false);
    expect(fake.sent('typing')).toEqual([
      { conversationId: CONVERSATION, isTyping: true },
      { conversationId: OTHER_CONVERSATION, isTyping: true },
      { conversationId: CONVERSATION, isTyping: true },
      { conversationId: CONVERSATION, isTyping: false },
    ]);
  });

  it('never queues typing while disconnected', () => {
    const { chat, fake } = setup();
    chat.start();
    chat.typing(CONVERSATION, true);
    fake.open();
    expect(fake.sent('typing')).toEqual([]);
  });

  it('marks read over the socket, or over REST when it is down or does not ack', async () => {
    const { chat, fake, deps } = setup();
    chat.start();
    await chat.markRead(CONVERSATION, SERVER_ID);
    expect(deps.markReadRest).toHaveBeenCalledWith(CONVERSATION, SERVER_ID);

    fake.open();
    fake.acks.set('message:read', { ok: true, lastReadMessageId: SERVER_ID });
    await chat.markRead(CONVERSATION, SERVER_ID);
    expect(fake.sent('message:read')).toEqual([
      { conversationId: CONVERSATION, messageId: SERVER_ID },
    ]);
    expect(deps.markReadRest).toHaveBeenCalledTimes(1);

    fake.acks.delete('message:read');
    await chat.markRead(CONVERSATION);
    expect(deps.markReadRest).toHaveBeenCalledTimes(2);
  });

  it('asks for presence, and answers null when it cannot know', async () => {
    const { chat, fake } = setup();
    chat.start();
    await expect(chat.presence(CONVERSATION)).resolves.toBeNull();
    fake.open();
    fake.acks.set('presence:get', { ok: true, online: true });
    await expect(chat.presence(CONVERSATION)).resolves.toBe(true);
    fake.acks.set('presence:get', { ok: false, code: 'NOT_FOUND', message: 'Not found' });
    await expect(chat.presence(CONVERSATION)).resolves.toBeNull();
  });

  it('forwards read receipts, typing and presence to listeners', () => {
    const { chat, fake } = setup();
    const read = vi.fn();
    const typing = vi.fn();
    const presence = vi.fn();
    chat.on('read', read);
    chat.on('typing', typing);
    const off = chat.on('presence', presence);
    chat.start();
    fake.open();
    const userId = '44444444-4444-4444-8444-444444444444';
    fake.fire('message:read', {
      conversationId: CONVERSATION,
      side: 'business',
      readerId: userId,
      messageId: SERVER_ID,
      readAt: CREATED_AT,
    });
    fake.fire('typing', { conversationId: CONVERSATION, userId, side: 'business', isTyping: true });
    fake.fire('presence', { userId, businessId: null, online: true });
    off();
    fake.fire('presence', { userId, businessId: null, online: false });
    expect(read).toHaveBeenCalledTimes(1);
    expect(typing).toHaveBeenCalledWith(expect.objectContaining({ isTyping: true }));
    expect(presence).toHaveBeenCalledTimes(1);
  });
});
