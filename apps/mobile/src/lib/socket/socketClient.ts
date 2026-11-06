import {
  AuthExpiredReason,
  authExpiredPayloadSchema,
  CHAT_LIMITS,
  messageNewPayloadSchema,
  messageReadPayloadSchema,
  presencePayloadSchema,
  sendAckSchema,
  SocketAuthError,
  socketErrorAckSchema,
  SocketEvent,
  typingPayloadSchema,
  type Message,
  type MessageReadPayload,
  type PresencePayload,
  type TypingPayload,
} from '@supporters/shared';
import { z } from 'zod';
import { ApiError } from '../api/errors';
import type { Outbox, OutboxItem } from './outbox';

/** The slice of a socket.io-client Socket this client uses; tests pass a fake. */
export interface RealtimeSocket {
  readonly connected: boolean;
  /** False after a refused handshake or `disconnect()`: socket.io no longer reconnects itself. */
  readonly active: boolean;
  connect(): void;
  disconnect(): void;
  on(event: string, listener: (payload: unknown) => void): void;
  emit(event: string, payload: unknown): void;
  /** Rejects when no ack arrives in time. */
  emitWithAck(event: string, payload: unknown, timeoutMs: number): Promise<unknown>;
}

export interface SocketOptions {
  path: string;
  /** Called on every (re)connect, so a reconnect always carries the latest token. */
  auth: (callback: (data: { token?: string }) => void) => void;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'offline';

export interface SendResult {
  id: string;
  createdAt: string;
  /** The stored message, when REST delivered it (the socket ack carries only id and time). */
  message?: Message;
}

export interface RealtimeEvents {
  message: Message;
  read: MessageReadPayload;
  typing: TypingPayload;
  presence: PresencePayload;
  status: ConnectionStatus;
  /** Every successful connect. After a drop, load what was missed with `?after=<lastId>`. */
  connected: { isReconnect: boolean };
  /** Acked by the server (socket or REST); `message:new` carries the full message. */
  sent: { item: OutboxItem; result: SendResult };
  /** Refused for good (blocked, validation, gone): it left the outbox. */
  sendFailed: { item: OutboxItem; code: string };
  /** The outbox changed. */
  outbox: undefined;
}

export interface RealtimeDeps {
  /** The API origin, e.g. https://api.example.in */
  url: string;
  /** Socket.IO path, `/v1/ws`. */
  path: string;
  createSocket: (url: string, options: SocketOptions) => RealtimeSocket;
  getToken: () => Promise<string | null>;
  /** Refreshes the session. False means it is over. */
  refresh: () => Promise<boolean>;
  getOutbox: () => Promise<Outbox>;
  /** The signed-in account, or null for guests. */
  getUserId: () => string | null;
  /** REST fallback with `Idempotency-Key: clientId`. */
  sendViaRest: (item: OutboxItem) => Promise<SendResult>;
  markReadViaRest: (conversationId: string, messageId?: string) => Promise<unknown>;
  ackTimeoutMs?: number;
  now?: () => number;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface RealtimeClient {
  /** Connects while signed in and in the foreground. Safe to call again. */
  start(): Promise<void>;
  /** Background or sign-out: drop the socket (push takes over). */
  stop(): void;
  status(): ConnectionStatus;
  /** After a token refresh: `auth:renew` on the live socket. */
  renew(accessToken: string): Promise<void>;
  /** Queues the message, then sends it over the socket or REST. Results arrive as events. */
  send(item: OutboxItem): Promise<void>;
  /** Retries the queue in order, with the same clientIds. */
  flush(): Promise<void>;
  /** Unsent messages of one thread, oldest first. */
  pending(conversationId: string): Promise<OutboxItem[]>;
  /** Drops a queued message the user discarded. */
  discard(clientId: string): Promise<void>;
  markRead(conversationId: string, messageId?: string): Promise<void>;
  /** Throttled to one `typing` per CHAT_LIMITS.typingThrottleMs per thread. */
  typing(conversationId: string, isTyping: boolean): void;
  /** Whether the other end is online, or null when unknown (offline, refused). */
  presence(conversationId: string): Promise<boolean | null>;
  on<E extends keyof RealtimeEvents>(
    event: E,
    listener: (payload: RealtimeEvents[E]) => void,
  ): () => void;
}

const DEFAULT_ACK_TIMEOUT_MS = 10_000;
/** Wait before retrying after a server error without Retry-After. */
const RETRY_DELAY_MS = 5_000;
/** Back off after `too_many_connections`. */
const CONNECTION_CAP_DELAY_MS = 30_000;

/** Codes worth another try with the same clientId; the rest are final. */
const RETRYABLE_CODES = new Set(['RATE_LIMITED', 'INTERNAL_ERROR', 'SERVICE_UNAVAILABLE']);

type Outcome =
  | { kind: 'sent'; result: SendResult }
  | { kind: 'failed'; code: string }
  | { kind: 'retry'; afterMs: number | null };

const presenceAckSchema = z.object({ ok: z.literal(true), online: z.boolean() });

function restOutcome(error: unknown): Outcome {
  if (!(error instanceof ApiError)) return { kind: 'retry', afterMs: null };
  // Offline (0), signed out mid-way (401), throttled or a server fault: keep it queued.
  if (error.status === 0 || error.status === 401) return { kind: 'retry', afterMs: null };
  if (error.status === 429 || error.status >= 500) {
    return { kind: 'retry', afterMs: (error.retryAfterSec ?? RETRY_DELAY_MS / 1000) * 1000 };
  }
  return { kind: 'failed', code: error.code };
}

export function createRealtimeClient(deps: RealtimeDeps): RealtimeClient {
  const ackTimeoutMs = deps.ackTimeoutMs ?? DEFAULT_ACK_TIMEOUT_MS;
  const now = deps.now ?? Date.now;
  const setTimer = deps.setTimer ?? ((callback, ms) => setTimeout(callback, ms));
  const clearTimer =
    deps.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  const listeners = new Map<keyof RealtimeEvents, Set<(payload: never) => void>>();
  let socket: RealtimeSocket | null = null;
  let current: ConnectionStatus = 'idle';
  let hasConnected = false;
  let refreshedForHandshake = false;
  let flushing: Promise<void> | null = null;
  let retryTimer: unknown = null;
  let reconnectTimer: unknown = null;
  const typingSentAt = new Map<string, number>();

  function emit<E extends keyof RealtimeEvents>(event: E, payload: RealtimeEvents[E]) {
    for (const listener of listeners.get(event) ?? []) {
      (listener as (value: RealtimeEvents[E]) => void)(payload);
    }
  }

  function setStatus(next: ConnectionStatus) {
    if (next === current) return;
    current = next;
    emit('status', next);
  }

  /** Server events are parsed with the shared schemas; anything else is dropped. */
  function relay<E extends 'message' | 'read' | 'typing' | 'presence'>(
    target: RealtimeSocket,
    name: string,
    schema: z.ZodType<RealtimeEvents[E]>,
    event: E,
  ) {
    target.on(name, (raw) => {
      const parsed = schema.safeParse(raw);
      if (parsed.success) emit(event, parsed.data);
    });
  }

  function reconnectLater(ms: number) {
    clearTimer(reconnectTimer);
    reconnectTimer = setTimer(() => {
      reconnectTimer = null;
      if (socket && !socket.connected) socket.connect();
    }, ms);
  }

  /** The access token expired: refresh once, then hand-shake again with the new one. */
  async function refreshAndReconnect(target: RealtimeSocket) {
    const ok = await deps.refresh().catch(() => false);
    if (socket !== target) return;
    if (ok) target.connect();
    else stop();
  }

  function attach(target: RealtimeSocket) {
    target.on('connect', () => {
      refreshedForHandshake = false;
      setStatus('connected');
      emit('connected', { isReconnect: hasConnected });
      hasConnected = true;
      void flush();
    });
    target.on('disconnect', () => {
      if (socket === target) setStatus('offline');
    });
    target.on('connect_error', (raw) => {
      setStatus('offline');
      const message = raw instanceof Error ? raw.message : '';
      // socket.io retries transport errors itself; a refused handshake leaves `active` false.
      if (target.active) return;
      if (message === SocketAuthError.Unauthorized && !refreshedForHandshake) {
        refreshedForHandshake = true;
        void refreshAndReconnect(target);
      } else if (message === SocketAuthError.TooManyConnections) {
        reconnectLater(CONNECTION_CAP_DELAY_MS);
      } else {
        // Refused again after a refresh, or a forbidden origin: retrying cannot help.
        stop();
      }
    });
    target.on(SocketEvent.AuthExpired, (raw) => {
      const parsed = authExpiredPayloadSchema.safeParse(raw);
      if (parsed.success && parsed.data.reason === AuthExpiredReason.TokenExpired) {
        void refreshAndReconnect(target);
      } else {
        // Revoked or invalid: the session is over; the API client signs out on its next call.
        stop();
      }
    });
    relay(target, SocketEvent.MessageNew, messageNewPayloadSchema, 'message');
    relay(target, SocketEvent.MessageRead, messageReadPayloadSchema, 'read');
    relay(target, SocketEvent.Typing, typingPayloadSchema, 'typing');
    relay(target, SocketEvent.Presence, presencePayloadSchema, 'presence');
  }

  async function start() {
    if (!deps.getUserId()) return;
    if (socket) {
      if (socket.connected) void flush();
      else socket.connect();
      return;
    }
    if (!(await deps.getToken())) return;
    // Another start() may have won the race while the token was read.
    if (socket) return;
    setStatus('connecting');
    socket = deps.createSocket(deps.url, {
      path: deps.path,
      auth: (callback) => {
        deps.getToken().then(
          (token) => callback(token ? { token: `Bearer ${token}` } : {}),
          () => callback({}),
        );
      },
    });
    attach(socket);
  }

  function stop() {
    clearTimer(retryTimer);
    clearTimer(reconnectTimer);
    retryTimer = null;
    reconnectTimer = null;
    typingSentAt.clear();
    const target = socket;
    socket = null;
    hasConnected = false;
    target?.disconnect();
    setStatus('idle');
  }

  async function overSocket(target: RealtimeSocket, item: OutboxItem): Promise<Outcome | null> {
    let ack: unknown;
    try {
      ack = await target.emitWithAck(
        SocketEvent.MessageSend,
        { conversationId: item.conversationId, clientId: item.clientId, ...item.draft },
        ackTimeoutMs,
      );
    } catch {
      // No ack in time: the server may or may not have it. REST with the same clientId is safe.
      return null;
    }
    const ok = sendAckSchema.safeParse(ack);
    if (ok.success)
      return { kind: 'sent', result: { id: ok.data.id, createdAt: ok.data.createdAt } };
    const failed = socketErrorAckSchema.safeParse(ack);
    if (!failed.success) return null;
    if (RETRYABLE_CODES.has(failed.data.code)) {
      return { kind: 'retry', afterMs: (failed.data.retryAfter ?? RETRY_DELAY_MS / 1000) * 1000 };
    }
    return { kind: 'failed', code: failed.data.code };
  }

  async function deliver(item: OutboxItem): Promise<Outcome> {
    const target = socket;
    if (target?.connected) {
      const outcome = await overSocket(target, item);
      if (outcome) return outcome;
    }
    try {
      return { kind: 'sent', result: await deps.sendViaRest(item) };
    } catch (error) {
      return restOutcome(error);
    }
  }

  async function drain() {
    const userId = deps.getUserId();
    if (!userId) return;
    const outbox = await deps.getOutbox();
    for (const item of outbox.list(userId)) {
      // Sign-out or another account while draining: leave the rest alone.
      if (deps.getUserId() !== userId) return;
      const outcome = await deliver(item);
      if (outcome.kind === 'retry') {
        // Keep the order: nothing later goes out before this one.
        if (outcome.afterMs !== null && socket) {
          clearTimer(retryTimer);
          retryTimer = setTimer(() => {
            retryTimer = null;
            void flush();
          }, outcome.afterMs);
        }
        return;
      }
      outbox.remove(item.clientId);
      emit('outbox', undefined);
      if (outcome.kind === 'sent') emit('sent', { item, result: outcome.result });
      else emit('sendFailed', { item, code: outcome.code });
    }
  }

  function flush(): Promise<void> {
    flushing ??= drain()
      .catch(() => undefined)
      .finally(() => {
        flushing = null;
      });
    return flushing;
  }

  async function send(item: OutboxItem) {
    (await deps.getOutbox()).put(item);
    emit('outbox', undefined);
    // A drain already running picks the new item up only if it has not listed yet.
    if (flushing) await flushing;
    await flush();
  }

  return {
    start,
    stop,
    status: () => current,
    renew: async (accessToken) => {
      const target = socket;
      if (!target?.connected) return;
      let ack: unknown;
      try {
        ack = await target.emitWithAck(
          SocketEvent.AuthRenew,
          { token: `Bearer ${accessToken}` },
          ackTimeoutMs,
        );
      } catch {
        return;
      }
      if (socket !== target) return;
      if (!(ack !== null && typeof ack === 'object' && 'ok' in ack && ack.ok === true)) {
        // Refused: hand-shake again, which reads the stored token.
        target.disconnect();
        target.connect();
      }
    },
    send,
    flush,
    pending: async (conversationId) => {
      const userId = deps.getUserId();
      if (!userId) return [];
      return (await deps.getOutbox())
        .list(userId)
        .filter((item) => item.conversationId === conversationId);
    },
    discard: async (clientId) => {
      (await deps.getOutbox()).remove(clientId);
      emit('outbox', undefined);
    },
    markRead: async (conversationId, messageId) => {
      const target = socket;
      if (target?.connected) {
        try {
          await target.emitWithAck(
            SocketEvent.MessageRead,
            messageId ? { conversationId, messageId } : { conversationId },
            ackTimeoutMs,
          );
          return;
        } catch {
          // Fall through to REST.
        }
      }
      await deps.markReadViaRest(conversationId, messageId);
    },
    typing: (conversationId, isTyping) => {
      const target = socket;
      if (!target?.connected) return;
      const last = typingSentAt.get(conversationId);
      if (isTyping) {
        if (last !== undefined && now() - last < CHAT_LIMITS.typingThrottleMs) return;
        typingSentAt.set(conversationId, now());
      } else {
        // Only stop what was started.
        if (last === undefined) return;
        typingSentAt.delete(conversationId);
      }
      target.emit(SocketEvent.Typing, { conversationId, isTyping });
    },
    presence: async (conversationId) => {
      const target = socket;
      if (!target?.connected) return null;
      try {
        const ack = presenceAckSchema.safeParse(
          await target.emitWithAck(SocketEvent.PresenceGet, { conversationId }, ackTimeoutMs),
        );
        return ack.success ? ack.data.online : null;
      } catch {
        return null;
      }
    },
    on: (event, listener) => {
      const set = listeners.get(event) ?? new Set();
      listeners.set(event, set);
      set.add(listener as (payload: never) => void);
      return () => {
        set.delete(listener as (payload: never) => void);
      };
    },
  };
}
