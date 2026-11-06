import {
  AuthExpiredReason,
  CHAT_LIMITS,
  type Message,
  type MessageReadPayload,
  type PresencePayload,
  type SendMessageInput,
  SocketAuthError,
  SocketEvent,
  type TypingPayload,
  authExpiredPayloadSchema,
  messageNewPayloadSchema,
  messageReadPayloadSchema,
  presencePayloadSchema,
  sendAckSchema,
  socketErrorAckSchema,
  typingPayloadSchema,
} from '@supporters/shared';
import { z } from 'zod';
import { ApiError } from '@/lib/api/errors';

/**
 * The browser's chat connection (web spec, Auth and data access: Socket.IO).
 *
 * - One Socket.IO connection per tab while signed in, same origin, at `/v1/ws`.
 *   The browser sends the `__Host-at` cookie; JavaScript never sees a token.
 * - A live websocket can't pick up a refreshed cookie, so on `token_expired`
 *   (or a refused handshake) it refreshes over HTTP once and reconnects.
 * - Every message gets a `clientId` when the user presses send and keeps it
 *   through every retry, socket or REST, so the API stores it once.
 * - Unsent messages wait in an outbox and go out on reconnect or when the
 *   browser comes back online. After a reconnect, listeners get `reconnected`
 *   so the caches catch up with `?after=<lastId>`.
 *
 * Kept free of React and of `socket.io-client` itself, so it is unit-tested
 * with a fake socket.
 */

/** The part of a Socket.IO client socket this module uses. */
export interface SocketLike {
  readonly connected: boolean;
  connect(): void;
  disconnect(): void;
  on(event: string, listener: (...args: unknown[]) => void): void;
  emit(event: string, ...args: unknown[]): void;
  timeout(ms: number): { emitWithAck(event: string, payload: unknown): Promise<unknown> };
}

export type ConnectionStatus =
  /** Not started, or stopped at sign-out. */
  | 'idle'
  | 'connecting'
  | 'connected'
  /** Lost; Socket.IO is retrying, and sends go over REST meanwhile. */
  | 'reconnecting'
  /** The server refused for good (wrong origin, too many tabs): REST only. */
  | 'unavailable';

export type PendingStatus = 'queued' | 'sending' | 'sent' | 'failed';

export interface PendingMessage {
  clientId: string;
  conversationId: string;
  input: SendMessageInput;
  status: PendingStatus;
  /** When the user pressed send (local clock), for ordering before the server answers. */
  createdAt: string;
  /** Set once the API has stored it. */
  id?: string;
  error?: { code: string; message: string; retryAfter?: number };
}

export interface ChatSocketEvents {
  message: (message: Message) => void;
  read: (payload: MessageReadPayload) => void;
  typing: (payload: TypingPayload) => void;
  presence: (payload: PresencePayload) => void;
  /** Connected again after a drop: caches should catch up. */
  reconnected: () => void;
  status: (status: ConnectionStatus) => void;
  outbox: (pending: readonly PendingMessage[]) => void;
}

export interface ChatSocketDeps {
  /** Creates the (not yet connected) socket. */
  createSocket: () => SocketLike;
  /** The API client's single-flight refresh. */
  refresh: () => Promise<boolean>;
  /** The session is gone: send the user to sign in. */
  onSessionExpired: () => void;
  /** `POST /v1/conversations/:id/messages` with `Idempotency-Key: clientId`. */
  sendRest: (conversationId: string, clientId: string, input: SendMessageInput) => Promise<Message>;
  /** `POST /v1/conversations/:id/read`. */
  markReadRest: (conversationId: string, messageId?: string) => Promise<unknown>;
  newClientId?: () => string;
  now?: () => number;
  ackTimeoutMs?: number;
}

const ACK_TIMEOUT_MS = 8_000;

const readAckSchema = z.object({ ok: z.literal(true) });
const presenceAckSchema = z.object({ ok: z.literal(true), online: z.boolean() });

/** Errors worth another try later; anything else is final for this attempt. */
function isRetryable(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500);
}

export function createChatSocket(deps: ChatSocketDeps) {
  const newClientId = deps.newClientId ?? (() => crypto.randomUUID());
  const now = deps.now ?? (() => Date.now());
  const ackTimeoutMs = deps.ackTimeoutMs ?? ACK_TIMEOUT_MS;

  let socket: SocketLike | null = null;
  let status: ConnectionStatus = 'idle';
  let hasConnected = false;
  /** One refresh per drop, so a refused cookie can't loop. Reset on each successful connect. */
  let hasRetriedAuth = false;
  const outbox = new Map<string, PendingMessage>();
  /** Last `typing: true` sent per thread, and whether a stop is owed. */
  const typingSentAt = new Map<string, number>();

  const listeners: { [K in keyof ChatSocketEvents]: Set<ChatSocketEvents[K]> } = {
    message: new Set(),
    read: new Set(),
    typing: new Set(),
    presence: new Set(),
    reconnected: new Set(),
    status: new Set(),
    outbox: new Set(),
  };

  function emitLocal<K extends keyof ChatSocketEvents>(
    event: K,
    ...args: Parameters<ChatSocketEvents[K]>
  ) {
    for (const listener of listeners[event]) {
      (listener as (...a: Parameters<ChatSocketEvents[K]>) => void)(...args);
    }
  }

  function setStatus(next: ConnectionStatus) {
    if (status === next) return;
    status = next;
    emitLocal('status', next);
  }

  let outboxSnapshot: readonly PendingMessage[] = [];
  function outboxChanged() {
    outboxSnapshot = [...outbox.values()];
    emitLocal('outbox', outboxSnapshot);
  }

  function patchPending(clientId: string, patch: Partial<PendingMessage>) {
    const pending = outbox.get(clientId);
    if (!pending) return;
    outbox.set(clientId, { ...pending, ...patch });
    outboxChanged();
  }

  /** Validated payloads only; anything malformed from the wire is dropped. */
  function forward<T>(schema: z.ZodType<T>, deliver: (value: T) => void) {
    return (payload: unknown) => {
      const parsed = schema.safeParse(payload);
      if (parsed.success) deliver(parsed.data);
    };
  }

  function receiveMessage(message: Message) {
    // The API echoes our own messages to every device: the pending copy is done.
    const pending = outbox.get(message.clientId);
    if (pending && pending.conversationId === message.conversationId) {
      outbox.delete(message.clientId);
      outboxChanged();
    }
    emitLocal('message', message);
  }

  async function refreshAndReconnect() {
    if (hasRetriedAuth) {
      deps.onSessionExpired();
      return;
    }
    hasRetriedAuth = true;
    setStatus('reconnecting');
    if (await deps.refresh()) {
      if (socket && status !== 'idle') socket.connect();
    } else {
      deps.onSessionExpired();
    }
  }

  function wire(next: SocketLike) {
    next.on('connect', () => {
      hasRetriedAuth = false;
      setStatus('connected');
      if (hasConnected) emitLocal('reconnected');
      hasConnected = true;
      flush();
    });
    next.on('disconnect', (reason: unknown) => {
      if (status === 'idle') return;
      // A server disconnect is followed by auth:expired, which decides what happens next.
      setStatus(reason === 'io client disconnect' ? 'idle' : 'reconnecting');
    });
    next.on('connect_error', (error: unknown) => {
      const message = error instanceof Error ? error.message : '';
      if (message === SocketAuthError.Unauthorized) {
        void refreshAndReconnect();
      } else if (
        message === SocketAuthError.ForbiddenOrigin ||
        message === SocketAuthError.TooManyConnections
      ) {
        setStatus('unavailable');
      } else {
        // Transport trouble: Socket.IO keeps retrying with backoff.
        setStatus('reconnecting');
      }
    });
    next.on(
      SocketEvent.AuthExpired,
      forward(authExpiredPayloadSchema, ({ reason }) => {
        if (reason === AuthExpiredReason.TokenExpired) {
          hasRetriedAuth = false;
          void refreshAndReconnect();
        } else {
          setStatus('idle');
          deps.onSessionExpired();
        }
      }),
    );
    next.on(SocketEvent.MessageNew, forward(messageNewPayloadSchema, receiveMessage));
    next.on(
      SocketEvent.MessageRead,
      forward(messageReadPayloadSchema, (payload) => emitLocal('read', payload)),
    );
    next.on(
      SocketEvent.Typing,
      forward(typingPayloadSchema, (payload) => emitLocal('typing', payload)),
    );
    next.on(
      SocketEvent.Presence,
      forward(presencePayloadSchema, (payload) => emitLocal('presence', payload)),
    );
  }

  async function deliver(clientId: string) {
    const pending = outbox.get(clientId);
    if (!pending || pending.status === 'sending' || pending.status === 'sent') return;
    patchPending(clientId, { status: 'sending', error: undefined });
    const { conversationId, input } = pending;

    if (socket?.connected) {
      try {
        const ack = await socket
          .timeout(ackTimeoutMs)
          .emitWithAck(SocketEvent.MessageSend, { conversationId, clientId, ...input });
        const sent = sendAckSchema.safeParse(ack);
        if (sent.success) {
          patchPending(clientId, {
            status: 'sent',
            id: sent.data.id,
            createdAt: sent.data.createdAt,
          });
          return;
        }
        const failed = socketErrorAckSchema.safeParse(ack);
        if (failed.success && failed.data.code !== 'INTERNAL_ERROR') {
          const { code, message, retryAfter } = failed.data;
          patchPending(clientId, { status: 'failed', error: { code, message, retryAfter } });
          return;
        }
      } catch {
        // No ack in time. The server may still have it; the same clientId makes REST safe.
      }
    }

    try {
      const message = await deps.sendRest(conversationId, clientId, input);
      receiveMessage(message);
    } catch (error) {
      if (isRetryable(error)) {
        // Offline: wait for the socket or the network to come back.
        patchPending(clientId, { status: 'queued' });
      } else {
        const apiError = error instanceof ApiError ? error : null;
        patchPending(clientId, {
          status: 'failed',
          error: {
            code: apiError?.code ?? 'UNKNOWN',
            message: apiError?.message ?? 'Not sent',
            retryAfter: apiError?.retryAfter,
          },
        });
      }
    }
  }

  /** Sends everything still queued, oldest first. */
  function flush() {
    const queued = [...outbox.values()].filter((pending) => pending.status === 'queued');
    for (const pending of queued) void deliver(pending.clientId);
  }

  const handleOnline = () => flush();

  return {
    /** Connects once per tab; later calls are no-ops. */
    start() {
      if (socket) return;
      socket = deps.createSocket();
      wire(socket);
      setStatus('connecting');
      socket.connect();
      if (typeof window !== 'undefined') window.addEventListener('online', handleOnline);
    },

    /** At sign-out: disconnect and forget unsent messages, which belong to that account. */
    stop() {
      if (typeof window !== 'undefined') window.removeEventListener('online', handleOnline);
      setStatus('idle');
      socket?.disconnect();
      socket = null;
      hasConnected = false;
      hasRetriedAuth = false;
      outbox.clear();
      typingSentAt.clear();
      outboxChanged();
    },

    get status() {
      return status;
    },

    /** Queues a message and sends it. Returns its clientId. */
    send(conversationId: string, input: SendMessageInput): string {
      const clientId = newClientId();
      outbox.set(clientId, {
        clientId,
        conversationId,
        input,
        status: 'queued',
        createdAt: new Date(now()).toISOString(),
      });
      outboxChanged();
      void deliver(clientId);
      return clientId;
    },

    /** Tries a failed message again with the same clientId. */
    retry(clientId: string) {
      const pending = outbox.get(clientId);
      if (!pending || pending.status !== 'failed') return;
      patchPending(clientId, { status: 'queued' });
      void deliver(clientId);
    },

    discard(clientId: string) {
      if (outbox.delete(clientId)) outboxChanged();
    },

    /** A sent copy is no longer needed once the cache holds the stored message. */
    settle(clientIds: Iterable<string>) {
      let changed = false;
      for (const clientId of clientIds) {
        if (outbox.get(clientId)?.status === 'sent') changed = outbox.delete(clientId) || changed;
      }
      if (changed) outboxChanged();
    },

    pending(): readonly PendingMessage[] {
      return outboxSnapshot;
    },

    /**
     * Typing, throttled to one `true` per `CHAT_LIMITS.typingThrottleMs` per
     * thread (the server drops faster ones), and one `false` only after a `true`.
     * Dropped while disconnected: typing is never worth queueing.
     */
    typing(conversationId: string, isTyping: boolean) {
      if (!socket?.connected) return;
      const last = typingSentAt.get(conversationId);
      if (isTyping) {
        if (last !== undefined && now() - last < CHAT_LIMITS.typingThrottleMs) return;
        typingSentAt.set(conversationId, now());
      } else {
        if (last === undefined) return;
        typingSentAt.delete(conversationId);
      }
      socket.emit(SocketEvent.Typing, { conversationId, isTyping });
    },

    /** Moves the read pointer: over the socket when connected, else over REST. */
    async markRead(conversationId: string, messageId?: string): Promise<void> {
      const payload = messageId ? { conversationId, messageId } : { conversationId };
      if (socket?.connected) {
        try {
          const ack = await socket
            .timeout(ackTimeoutMs)
            .emitWithAck(SocketEvent.MessageRead, payload);
          if (readAckSchema.safeParse(ack).success) return;
        } catch {
          // Fall through to REST.
        }
      }
      await deps.markReadRest(conversationId, messageId);
    },

    /** Whether the other end is online, or null when it can't be known right now. */
    async presence(conversationId: string): Promise<boolean | null> {
      if (!socket?.connected) return null;
      try {
        const ack = await socket
          .timeout(ackTimeoutMs)
          .emitWithAck(SocketEvent.PresenceGet, { conversationId });
        const parsed = presenceAckSchema.safeParse(ack);
        return parsed.success ? parsed.data.online : null;
      } catch {
        return null;
      }
    },

    on<K extends keyof ChatSocketEvents>(event: K, listener: ChatSocketEvents[K]): () => void {
      listeners[event].add(listener);
      return () => {
        listeners[event].delete(listener);
      };
    },
  };
}

export type ChatSocket = ReturnType<typeof createChatSocket>;
