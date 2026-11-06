import { CHAT_LIMITS, type Message } from '@supporters/shared';
import { ApiError } from '../api/errors';
import type { KeyValueStore } from '../storage/encrypted-storage';
import { createOutbox, type Outbox, type OutboxItem } from './outbox';
import {
  createRealtimeClient,
  type RealtimeDeps,
  type RealtimeSocket,
  type SocketOptions,
} from './socketClient';

const USER = '00000000-0000-4000-8000-000000000001';
const OTHER_USER = '00000000-0000-4000-8000-000000000002';
const CONVERSATION = '10000000-0000-4000-8000-000000000001';
const MESSAGE_ID = '20000000-0000-4000-8000-000000000001';
const clientId = (n: number) => `30000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const NOW = '2026-11-04T10:00:00.000Z';

type Handler = (payload: unknown) => void;
type AckReply = unknown | Error | ((payload: unknown) => unknown);

/** A socket.io-client stand-in: tests fire server events and script the acks. */
class FakeSocket implements RealtimeSocket {
  connected = false;
  active = true;
  handlers = new Map<string, Handler[]>();
  emitted: { event: string; payload: unknown }[] = [];
  acks = new Map<string, AckReply[]>();
  connectCalls = 0;
  disconnectCalls = 0;

  constructor(readonly options: SocketOptions) {}

  on(event: string, listener: Handler) {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), listener]);
  }
  fire(event: string, payload?: unknown) {
    for (const handler of this.handlers.get(event) ?? []) handler(payload);
  }
  connect() {
    this.connectCalls += 1;
    this.active = true;
  }
  disconnect() {
    this.disconnectCalls += 1;
    this.connected = false;
    this.active = false;
  }
  emit(event: string, payload: unknown) {
    this.emitted.push({ event, payload });
  }
  /** Queue the next ack for an event: a value, a thrown Error (timeout), or a function. */
  reply(event: string, ...replies: AckReply[]) {
    this.acks.set(event, [...(this.acks.get(event) ?? []), ...replies]);
  }
  async emitWithAck(event: string, payload: unknown) {
    this.emitted.push({ event, payload });
    const queue = this.acks.get(event) ?? [];
    const next = queue.shift();
    if (next instanceof Error) throw next;
    if (typeof next === 'function') return (next as (value: unknown) => unknown)(payload);
    if (next === undefined) throw new Error('timeout');
    return next;
  }
  /** Server side of a successful handshake. */
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

function memoryStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getString: (key) => map.get(key),
    set: (key, value) => {
      map.set(key, value);
    },
    remove: (key) => {
      map.delete(key);
    },
  };
}

function item(n: number, overrides: Partial<OutboxItem> = {}): OutboxItem {
  return {
    clientId: clientId(n),
    conversationId: CONVERSATION,
    userId: USER,
    draft: { type: 'text', body: `hello ${n}` },
    createdAt: NOW,
    ...overrides,
  };
}

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: MESSAGE_ID,
    conversationId: CONVERSATION,
    senderSide: 'business',
    senderId: OTHER_USER,
    clientId: clientId(99),
    type: 'text',
    body: 'Namaste',
    attachments: [],
    listing: null,
    enquiry: null,
    createdAt: NOW,
    ...overrides,
  };
}

const flushPromises = () => new Promise<void>((resolve) => setImmediate(() => resolve()));

function setup(overrides: Partial<RealtimeDeps> = {}) {
  const sockets: FakeSocket[] = [];
  const store = memoryStore();
  const outbox: Outbox = createOutbox(store);
  let token: string | null = 'access-1';
  let userId: string | null = USER;
  const timers: { callback: () => void; ms: number }[] = [];
  const deps: RealtimeDeps = {
    url: 'https://api.example.in',
    path: '/v1/ws',
    createSocket: (_url, options) => {
      const socket = new FakeSocket(options);
      sockets.push(socket);
      return socket;
    },
    getToken: async () => token,
    refresh: jest.fn(async () => {
      token = 'access-2';
      return true;
    }),
    getOutbox: async () => outbox,
    getUserId: () => userId,
    sendViaRest: jest.fn(async () => ({ id: MESSAGE_ID, createdAt: NOW })),
    markReadViaRest: jest.fn(async () => undefined),
    now: () => clock,
    setTimer: (callback, ms) => {
      const timer = { callback, ms };
      timers.push(timer);
      return timer;
    },
    clearTimer: (handle) => {
      const index = timers.indexOf(handle as (typeof timers)[number]);
      if (index >= 0) timers.splice(index, 1);
    },
    ...overrides,
  };
  let clock = 1_000_000;
  const client = createRealtimeClient(deps);
  return {
    client,
    deps,
    outbox,
    store,
    timers,
    sockets,
    socket: () => sockets[sockets.length - 1]!,
    setToken: (next: string | null) => {
      token = next;
    },
    setUser: (next: string | null) => {
      userId = next;
    },
    tick: (ms: number) => {
      clock += ms;
    },
  };
}

async function handshake(options: SocketOptions) {
  return new Promise<{ token?: string }>((resolve) => options.auth(resolve));
}

describe('realtime client: connection', () => {
  it('connects to /v1/ws with the access token in auth.token', async () => {
    const { client, socket } = setup();
    await client.start();
    expect(socket().options.path).toBe('/v1/ws');
    await expect(handshake(socket().options)).resolves.toEqual({ token: 'Bearer access-1' });
  });

  it('stays off for guests and without a token', async () => {
    const guest = setup();
    guest.setUser(null);
    await guest.client.start();
    expect(guest.sockets).toHaveLength(0);

    const noToken = setup();
    noToken.setToken(null);
    await noToken.client.start();
    expect(noToken.sockets).toHaveLength(0);
  });

  it('opens one socket however often start() runs', async () => {
    const { client, sockets } = setup();
    await Promise.all([client.start(), client.start()]);
    await client.start();
    expect(sockets).toHaveLength(1);
  });

  it('reads the newest token on every reconnect', async () => {
    const { client, socket, setToken } = setup();
    await client.start();
    socket().open();
    socket().drop();
    setToken('access-9');
    await expect(handshake(socket().options)).resolves.toEqual({ token: 'Bearer access-9' });
  });

  it('reports status and marks reconnects so missed messages load', async () => {
    const { client, socket } = setup();
    const statuses: string[] = [];
    const connects: boolean[] = [];
    client.on('status', (status) => statuses.push(status));
    client.on('connected', ({ isReconnect }) => connects.push(isReconnect));
    await client.start();
    socket().open();
    socket().drop();
    socket().open();
    expect(statuses).toEqual(['connecting', 'connected', 'offline', 'connected']);
    expect(connects).toEqual([false, true]);
  });

  it('disconnects on stop() (background, sign-out)', async () => {
    const { client, socket } = setup();
    await client.start();
    socket().open();
    client.stop();
    expect(socket().disconnectCalls).toBe(1);
    expect(client.status()).toBe('idle');
  });

  it('refreshes once and reconnects after an unauthorized handshake', async () => {
    const { client, socket, deps } = setup();
    await client.start();
    socket().active = false;
    socket().fire('connect_error', new Error('unauthorized'));
    await flushPromises();
    expect(deps.refresh).toHaveBeenCalledTimes(1);
    expect(socket().connectCalls).toBe(1);
    await expect(handshake(socket().options)).resolves.toEqual({ token: 'Bearer access-2' });

    // Refused again with the fresh token: give up instead of looping.
    socket().active = false;
    socket().fire('connect_error', new Error('unauthorized'));
    await flushPromises();
    expect(deps.refresh).toHaveBeenCalledTimes(1);
    expect(client.status()).toBe('idle');
  });

  it('lets socket.io retry transport errors itself', async () => {
    const { client, socket, deps } = setup();
    await client.start();
    socket().fire('connect_error', new Error('websocket error'));
    expect(deps.refresh).not.toHaveBeenCalled();
    expect(client.status()).toBe('offline');
  });

  it('backs off after too_many_connections', async () => {
    const { client, socket, timers } = setup();
    await client.start();
    socket().active = false;
    socket().fire('connect_error', new Error('too_many_connections'));
    expect(timers).toHaveLength(1);
    timers[0]!.callback();
    expect(socket().connectCalls).toBe(1);
  });

  it('refreshes and reconnects on auth:expired token_expired', async () => {
    const { client, socket, deps } = setup();
    await client.start();
    socket().open();
    socket().fire('auth:expired', { reason: 'token_expired' });
    socket().disconnect();
    await flushPromises();
    expect(deps.refresh).toHaveBeenCalled();
    expect(socket().connectCalls).toBe(1);
  });

  it('stops for good when the session is revoked', async () => {
    const { client, socket, deps } = setup();
    await client.start();
    socket().open();
    socket().fire('auth:expired', { reason: 'session_revoked' });
    expect(deps.refresh).not.toHaveBeenCalled();
    expect(client.status()).toBe('idle');
  });
});

describe('realtime client: auth:renew', () => {
  it('sends the new token on the live socket', async () => {
    const { client, socket } = setup();
    await client.start();
    socket().open();
    socket().reply('auth:renew', { ok: true, expiresAt: NOW });
    await client.renew('access-2');
    expect(socket().sent('auth:renew')).toEqual([{ token: 'Bearer access-2' }]);
    expect(socket().disconnectCalls).toBe(0);
  });

  it('hand-shakes again when the server refuses the renewal', async () => {
    const { client, socket } = setup();
    await client.start();
    socket().open();
    socket().reply('auth:renew', { ok: false, code: 'CONFLICT', message: 'x' });
    await client.renew('access-2');
    expect(socket().disconnectCalls).toBe(1);
    expect(socket().connectCalls).toBe(1);
  });

  it('does nothing while offline: the next handshake reads the new token', async () => {
    const { client, socket } = setup();
    await client.start();
    await client.renew('access-2');
    expect(socket().sent('auth:renew')).toEqual([]);
  });
});

describe('realtime client: incoming events', () => {
  it('relays message:new, message:read, typing and presence after parsing them', async () => {
    const { client, socket } = setup();
    const received: unknown[] = [];
    client.on('message', (payload) => received.push(['message', payload.id]));
    client.on('read', (payload) => received.push(['read', payload.messageId]));
    client.on('typing', (payload) => received.push(['typing', payload.isTyping]));
    client.on('presence', (payload) => received.push(['presence', payload.online]));
    await client.start();
    socket().open();

    socket().fire('message:new', message());
    socket().fire('message:read', {
      conversationId: CONVERSATION,
      side: 'business',
      readerId: OTHER_USER,
      messageId: MESSAGE_ID,
      readAt: NOW,
    });
    socket().fire('typing', {
      conversationId: CONVERSATION,
      userId: OTHER_USER,
      side: 'business',
      isTyping: true,
    });
    socket().fire('presence', { userId: OTHER_USER, businessId: null, online: true });
    // Malformed payloads never reach the app.
    socket().fire('message:new', { id: 'nope' });
    socket().fire('typing', { conversationId: CONVERSATION });

    expect(received).toEqual([
      ['message', MESSAGE_ID],
      ['read', MESSAGE_ID],
      ['typing', true],
      ['presence', true],
    ]);
  });

  it('unsubscribes listeners', async () => {
    const { client, socket } = setup();
    const listener = jest.fn();
    const off = client.on('message', listener);
    await client.start();
    socket().open();
    off();
    socket().fire('message:new', message());
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('realtime client: sending', () => {
  it('sends over the socket with the flat payload and clientId, then empties the outbox', async () => {
    const { client, socket, outbox, deps } = setup();
    const sent = jest.fn();
    client.on('sent', sent);
    await client.start();
    socket().open();
    socket().reply('message:send', { ok: true, id: MESSAGE_ID, createdAt: NOW });

    await client.send(item(1));

    expect(socket().sent('message:send')).toEqual([
      { conversationId: CONVERSATION, clientId: clientId(1), type: 'text', body: 'hello 1' },
    ]);
    expect(sent).toHaveBeenCalledWith({
      item: item(1),
      result: { id: MESSAGE_ID, createdAt: NOW },
    });
    expect(outbox.list(USER)).toEqual([]);
    expect(deps.sendViaRest).not.toHaveBeenCalled();
  });

  it('falls back to REST with the same clientId when no ack arrives', async () => {
    const { client, socket, deps, outbox } = setup();
    await client.start();
    socket().open();
    socket().reply('message:send', new Error('operation has timed out'));

    await client.send(item(1));

    expect(deps.sendViaRest).toHaveBeenCalledWith(item(1));
    expect(outbox.list(USER)).toEqual([]);
  });

  it('uses REST while the socket is down', async () => {
    const { client, deps } = setup();
    await client.send(item(1));
    expect(deps.sendViaRest).toHaveBeenCalledWith(item(1));
  });

  it('queues offline sends and retries them in order with the same clientId on reconnect', async () => {
    const sendViaRest = jest.fn(async () => {
      throw new ApiError(0, 'NETWORK_ERROR');
    });
    const { client, socket, outbox } = setup({ sendViaRest });
    await client.start();
    await client.send(item(1));
    await client.send(item(2));
    expect(outbox.list(USER).map((entry) => entry.clientId)).toEqual([clientId(1), clientId(2)]);

    const order: string[] = [];
    socket().reply(
      'message:send',
      (payload: unknown) => {
        order.push((payload as { clientId: string }).clientId);
        return { ok: true, id: MESSAGE_ID, createdAt: NOW };
      },
      (payload: unknown) => {
        order.push((payload as { clientId: string }).clientId);
        return { ok: true, id: MESSAGE_ID, createdAt: NOW };
      },
    );
    socket().open();
    await flushPromises();
    await client.flush();

    expect(order).toEqual([clientId(1), clientId(2)]);
    expect(outbox.list(USER)).toEqual([]);
  });

  it('keeps the queue across restarts (a new client over the same store)', async () => {
    const first = setup({
      sendViaRest: jest.fn(async () => {
        throw new ApiError(0, 'NETWORK_ERROR');
      }),
    });
    await first.client.send(item(1));

    const restored = createOutbox(first.store);
    const second = createRealtimeClient({ ...first.deps, getOutbox: async () => restored });
    expect(await second.pending(CONVERSATION)).toEqual([item(1)]);
    (first.deps.sendViaRest as jest.Mock).mockResolvedValue({ id: MESSAGE_ID, createdAt: NOW });
    await second.flush();
    expect(restored.list(USER)).toEqual([]);
  });

  it('does not create a second message when the same clientId is sent twice', async () => {
    const { client, socket, outbox } = setup();
    await client.start();
    socket().open();
    socket().reply(
      'message:send',
      { ok: true, id: MESSAGE_ID, createdAt: NOW },
      { ok: true, id: MESSAGE_ID, createdAt: NOW },
    );
    const sent = jest.fn();
    client.on('sent', sent);
    outbox.put(item(1));
    outbox.put(item(1));
    expect(outbox.list(USER)).toHaveLength(1);
    await client.flush();
    expect(socket().sent('message:send')).toHaveLength(1);
    expect(sent).toHaveBeenCalledTimes(1);
  });

  it('drops a refused message from the queue and reports why', async () => {
    const { client, socket, outbox } = setup();
    const failed = jest.fn();
    client.on('sendFailed', failed);
    await client.start();
    socket().open();
    socket().reply('message:send', { ok: false, code: 'BLOCKED', message: 'Blocked' });

    await client.send(item(1));

    expect(failed).toHaveBeenCalledWith({ item: item(1), code: 'BLOCKED' });
    expect(outbox.list(USER)).toEqual([]);
  });

  it('waits out RATE_LIMITED and keeps later messages behind it', async () => {
    const { client, socket, outbox, timers } = setup();
    await client.start();
    socket().open();
    const limited = { ok: false, code: 'RATE_LIMITED', message: 'Slow down', retryAfter: 4 };
    // The second send retries the head of the queue first, which is still limited.
    socket().reply('message:send', limited, limited);
    await client.send(item(1));
    await client.send(item(2));

    expect(outbox.list(USER)).toHaveLength(2);
    expect(timers.map((timer) => timer.ms)).toContain(4_000);
  });

  it('keeps REST 5xx failures queued, drops 4xx ones', async () => {
    const sendViaRest = jest
      .fn()
      .mockRejectedValueOnce(new ApiError(503, 'SERVICE_UNAVAILABLE'))
      .mockRejectedValueOnce(new ApiError(422, 'IDEMPOTENCY_KEY_REUSED'));
    const { client, outbox } = setup({ sendViaRest });
    const failed = jest.fn();
    client.on('sendFailed', failed);

    await client.send(item(1));
    expect(outbox.list(USER)).toHaveLength(1);

    await client.flush();
    expect(outbox.list(USER)).toEqual([]);
    expect(failed).toHaveBeenCalledWith({ item: item(1), code: 'IDEMPOTENCY_KEY_REUSED' });
  });

  it("never sends another account's queued messages", async () => {
    const { client, outbox, deps } = setup();
    outbox.put(item(1, { userId: OTHER_USER }));
    await client.flush();
    expect(deps.sendViaRest).not.toHaveBeenCalled();
    expect(await client.pending(CONVERSATION)).toEqual([]);
  });

  it('discards a queued message', async () => {
    const { client, outbox } = setup();
    outbox.put(item(1));
    await client.discard(clientId(1));
    expect(outbox.list(USER)).toEqual([]);
  });
});

describe('realtime client: read, typing, presence', () => {
  it('marks read over the socket, or REST when offline', async () => {
    const { client, socket, deps } = setup();
    await client.markRead(CONVERSATION, MESSAGE_ID);
    expect(deps.markReadViaRest).toHaveBeenCalledWith(CONVERSATION, MESSAGE_ID);

    await client.start();
    socket().open();
    socket().reply('message:read', { ok: true, lastReadMessageId: MESSAGE_ID });
    await client.markRead(CONVERSATION, MESSAGE_ID);
    expect(socket().sent('message:read')).toEqual([
      { conversationId: CONVERSATION, messageId: MESSAGE_ID },
    ]);
    expect(deps.markReadViaRest).toHaveBeenCalledTimes(1);
  });

  it('throttles typing to one event per window and only stops what started', async () => {
    const { client, socket, tick } = setup();
    await client.start();
    socket().open();

    client.typing(CONVERSATION, false);
    client.typing(CONVERSATION, true);
    client.typing(CONVERSATION, true);
    tick(CHAT_LIMITS.typingThrottleMs - 1);
    client.typing(CONVERSATION, true);
    tick(1);
    client.typing(CONVERSATION, true);
    client.typing(CONVERSATION, false);
    client.typing(CONVERSATION, false);

    expect(socket().sent('typing')).toEqual([
      { conversationId: CONVERSATION, isTyping: true },
      { conversationId: CONVERSATION, isTyping: true },
      { conversationId: CONVERSATION, isTyping: false },
    ]);
  });

  it('asks for presence, and answers null when unknown', async () => {
    const { client, socket } = setup();
    expect(await client.presence(CONVERSATION)).toBeNull();
    await client.start();
    socket().open();
    socket().reply('presence:get', { ok: true, online: true }, { ok: false, code: 'NOT_FOUND' });
    expect(await client.presence(CONVERSATION)).toBe(true);
    expect(await client.presence(CONVERSATION)).toBeNull();
  });
});
