import { createAdapter } from '@socket.io/redis-adapter';
import {
  AuthExpiredReason,
  CHAT_LIMITS,
  type ChatSide,
  type Message,
  RATE_LIMITS,
  SocketAuthError,
  NotificationSocketEvent,
  SocketEvent,
  notificationNewEventSchema,
  authRenewSchema,
  presenceQuerySchema,
  readEventSchema,
  sendEnvelopeSchema,
  sendMessageSchema,
  typingEventSchema,
} from '@supporters/shared';
import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Server, type Socket } from 'socket.io';
import { z } from 'zod';
import { AppError, ErrorCode, rateLimited } from '../lib/errors';
import { SESSION_REVOKED_CHANNEL, revokedSessionKey } from '../modules/auth/auth.constants';
import { COOKIE } from '../modules/auth/auth.cookies';
import type { ChatEvents, ConversationRef } from '../modules/chat/chat.service';
import { NOTIFICATIONS_CHANNEL } from '../modules/notifications/delivery';

export const WS_PATH = '/v1/ws';

interface SocketData {
  userId: string;
  sessionId: string;
  /** Seconds since the epoch; the socket ends here unless the client renews. */
  exp: number;
  businessId: string | null;
  mode: 'cookie' | 'token';
}
type AnyEvents = Record<string, (...args: unknown[]) => void>;
type ChatSocket = Socket<AnyEvents, AnyEvents, AnyEvents, SocketData>;

const userRoom = (userId: string) => `user:${userId}`;
const businessRoom = (businessId: string) => `business:${businessId}`;
const presenceKey = (userId: string) => `presence:${userId}`;
const BEARER_PREFIX = /^Bearer\s+/i;

type Ack = (response: object) => void;

/**
 * Chat over Socket.IO at `/v1/ws` (backend spec, Realtime chat). It shares the
 * HTTP server and the chat service, so REST and the socket obey the same rules.
 * The Valkey adapter fans events out across API instances.
 */
export const realtimePlugin = fp(
  async (app: FastifyInstance) => {
    const { env, valkey, prisma } = app;
    const { chat, blocks } = app.services;

    const pub = valkey.duplicate();
    const sub = valkey.duplicate();
    const revocations = valkey.duplicate();
    const io = new Server<AnyEvents, AnyEvents, AnyEvents, SocketData>(app.server, {
      path: WS_PATH,
      serveClient: false,
      maxHttpBufferSize: CHAT_LIMITS.socketMaxPayloadBytes,
      adapter: createAdapter(pub, sub),
    });

    const bySession = new Map<string, Set<ChatSocket>>();
    const perUser = new Map<string, number>();
    const expiryTimers = new WeakMap<ChatSocket, NodeJS.Timeout>();
    const heartbeats = new WeakMap<ChatSocket, NodeJS.Timeout>();
    const typingTimers = new WeakMap<ChatSocket, Map<string, NodeJS.Timeout>>();
    const allowedTokenOrigins = new Set([env.APP_ORIGIN, ...env.CORS_ORIGINS]);

    // Handshake. Web: the HttpOnly __Host-at cookie plus an exact Origin. Mobile: auth.token.
    io.use((socket, next) => {
      authenticate(socket).then(
        (data) => {
          socket.data = data;
          next();
        },
        (error: unknown) =>
          next(new Error(error instanceof Error ? error.message : 'unauthorized')),
      );
    });

    async function authenticate(socket: ChatSocket): Promise<SocketData> {
      const { handshake } = socket;
      const origin = handshake.headers.origin;
      const auth: unknown = handshake.auth;
      const given =
        typeof auth === 'object' &&
        auth !== null &&
        'token' in auth &&
        typeof auth.token === 'string'
          ? auth.token.replace(BEARER_PREFIX, '')
          : undefined;

      let token: string | undefined;
      let mode: SocketData['mode'];
      if (given) {
        mode = 'token';
        token = given;
        if (origin !== undefined && !allowedTokenOrigins.has(origin)) {
          throw new Error(SocketAuthError.ForbiddenOrigin);
        }
      } else {
        mode = 'cookie';
        if (origin !== env.APP_ORIGIN) throw new Error(SocketAuthError.ForbiddenOrigin);
        token = app.parseCookie(handshake.headers.cookie ?? '')[COOKIE.access];
      }

      const claims = token ? app.accessTokens.verify(token) : null;
      if (!claims) throw new Error(SocketAuthError.Unauthorized);
      if ((await valkey.exists(revokedSessionKey(claims.sid))) > 0) {
        throw new Error(SocketAuthError.Unauthorized);
      }
      const user = await prisma.user.findUnique({
        where: { id: claims.sub },
        select: { status: true, business: { select: { id: true } } },
      });
      if (user?.status !== 'active') throw new Error(SocketAuthError.Unauthorized);
      if ((perUser.get(claims.sub) ?? 0) >= CHAT_LIMITS.socketsPerUser) {
        throw new Error(SocketAuthError.TooManyConnections);
      }
      return {
        userId: claims.sub,
        sessionId: claims.sid,
        exp: claims.exp,
        businessId: user.business?.id ?? null,
        mode,
      };
    }

    /** Tells the client why, then drops the socket. */
    function end(socket: ChatSocket, reason: AuthExpiredReason) {
      socket.emit(SocketEvent.AuthExpired, { reason });
      socket.disconnect(true);
    }

    function scheduleExpiry(socket: ChatSocket) {
      clearTimeout(expiryTimers.get(socket));
      const delay = Math.max(0, socket.data.exp * 1000 - Date.now());
      expiryTimers.set(
        socket,
        setTimeout(() => end(socket, AuthExpiredReason.TokenExpired), delay),
      );
    }

    // A revoked session disconnects at once, on whichever instance holds the socket.
    // The worker publishes badge counts; every instance emits to its own sockets only
    // (io.local), since each one receives the same message.
    void revocations.subscribe(SESSION_REVOKED_CHANNEL, NOTIFICATIONS_CHANNEL);
    revocations.on('message', (channel: string, message: string) => {
      if (channel === NOTIFICATIONS_CHANNEL) {
        emitNotification(message);
        return;
      }
      for (const socket of bySession.get(message) ?? []) {
        end(socket, AuthExpiredReason.SessionRevoked);
      }
    });

    function emitNotification(message: string) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(message);
      } catch {
        return;
      }
      const event = notificationNewEventSchema.extend({ userId: z.uuid() }).safeParse(parsed);
      if (!event.success) return;
      const { userId, ...payload } = event.data;
      io.local.to(userRoom(userId)).emit(NotificationSocketEvent.New, payload);
    }

    // Presence: a sorted set of live sockets per account, scored by expiry. Online means
    // at least one unexpired member; the heartbeat renews it, so a crash ages out in 60 s.
    async function isOnline(userId: string): Promise<boolean> {
      const key = presenceKey(userId);
      await valkey.zremrangebyscore(key, '-inf', Date.now());
      return (await valkey.zcard(key)) > 0;
    }
    async function touchPresence(socket: ChatSocket) {
      const key = presenceKey(socket.data.userId);
      await valkey.zadd(key, Date.now() + CHAT_LIMITS.presenceTtlSec * 1000, socket.id);
      await valkey.expire(key, CHAT_LIMITS.presenceTtlSec * 2);
    }

    /** Rooms of everyone who shares a thread with the account, minus blocked pairs. */
    async function counterpartRooms(userId: string): Promise<string[]> {
      const blockedWith = (me: string) => ({
        OR: [
          { blocksMade: { some: { blockedId: me } } },
          { blocksReceived: { some: { blockerId: me } } },
        ],
      });
      const rows = await prisma.conversation.findMany({
        where: {
          OR: [{ userId }, { business: { ownerUserId: userId } }],
          NOT: {
            OR: [
              { userId, business: { owner: blockedWith(userId) } },
              { business: { ownerUserId: userId }, user: blockedWith(userId) },
            ],
          },
        },
        select: { userId: true, businessId: true },
        take: 500,
      });
      return [
        ...new Set(
          rows.map((row) =>
            row.userId === userId ? businessRoom(row.businessId) : userRoom(row.userId),
          ),
        ),
      ];
    }

    async function announcePresence(socket: ChatSocket, online: boolean) {
      const rooms = await counterpartRooms(socket.data.userId);
      if (rooms.length === 0) return;
      io.to(rooms).emit(SocketEvent.Presence, {
        userId: socket.data.userId,
        businessId: socket.data.businessId,
        online,
      });
    }

    /** Fire and forget, but never an unhandled rejection. */
    const background = (work: Promise<unknown>): void =>
      void work.catch((error: unknown) =>
        app.log.warn({ err: error }, 'realtime background task failed'),
      );

    io.on('connection', (socket: ChatSocket) => {
      const { userId, sessionId, businessId } = socket.data;
      void socket.join(userRoom(userId));
      if (businessId) void socket.join(businessRoom(businessId));
      perUser.set(userId, (perUser.get(userId) ?? 0) + 1);
      const sessionSockets = bySession.get(sessionId) ?? new Set();
      sessionSockets.add(socket);
      bySession.set(sessionId, sessionSockets);
      scheduleExpiry(socket);

      background(
        (async () => {
          const wasOnline = await isOnline(userId);
          await touchPresence(socket);
          if (!wasOnline) await announcePresence(socket, true);
        })(),
      );
      heartbeats.set(
        socket,
        setInterval(
          () => background(touchPresence(socket)),
          CHAT_LIMITS.presenceHeartbeatSec * 1000,
        ),
      );

      /** One handler shape for every event: rate limit, validate, run, ack, never throw. */
      function on<S extends z.ZodType>(
        event: string,
        schema: S,
        run: (input: z.output<S>) => Promise<object | undefined>,
        options: { limited?: boolean } = {},
      ) {
        socket.on(event, (payload: unknown, ack?: unknown) => {
          const reply: Ack = typeof ack === 'function' ? (ack as Ack) : () => undefined;
          void (async () => {
            try {
              if (options.limited !== false) {
                const limit = await app.limiter.hit(
                  `ws-events:${userId}`,
                  RATE_LIMITS.socketEvents.max,
                  RATE_LIMITS.socketEvents.windowSec,
                );
                if (!limit.allowed) throw rateLimited(limit.resetMs / 1000);
              }
              const parsed = schema.safeParse(payload);
              if (!parsed.success) {
                throw new AppError(400, ErrorCode.ValidationFailed, 'Validation failed', {
                  errors: parsed.error.issues.map((issue) => ({
                    path: issue.path.join('.'),
                    message: issue.message,
                  })),
                });
              }
              reply({ ok: true, ...(await run(parsed.data)) });
            } catch (error) {
              reply(errorAck(error));
            }
          })();
        });
      }

      function errorAck(error: unknown) {
        if (error instanceof AppError) {
          return {
            ok: false,
            code: error.code,
            message: error.title,
            ...(error.errors ? { errors: error.errors } : {}),
            ...(error.retryAfter !== undefined ? { retryAfter: Math.ceil(error.retryAfter) } : {}),
          };
        }
        app.log.error({ err: error }, 'socket event failed');
        return { ok: false, code: ErrorCode.InternalError, message: 'Something went wrong' };
      }

      // message:send: the sends are limited inside the chat service (30 per 10 s per user).
      on(
        SocketEvent.MessageSend,
        sendEnvelopeSchema,
        async (envelope) => {
          const { conversationId, clientId, ...rest } = envelope;
          const parsed = sendMessageSchema.safeParse(rest);
          if (!parsed.success) {
            throw new AppError(400, ErrorCode.ValidationFailed, 'Validation failed', {
              errors: parsed.error.issues.map((issue) => ({
                path: issue.path.join('.'),
                message: issue.message,
              })),
            });
          }
          const { message } = await chat.send(userId, conversationId, clientId, parsed.data);
          return { id: message.id, createdAt: message.createdAt };
        },
        { limited: false },
      );

      on(SocketEvent.MessageRead, readEventSchema, async (input) =>
        chat.markRead(userId, input.conversationId, input.messageId),
      );

      on(SocketEvent.Typing, typingEventSchema, async (input) => {
        const member = await chat.requireMember(userId, input.conversationId);
        // A blocked or suspended peer gets nothing, and the sender is not told why.
        if (!member.isSelfActive || !member.isPeerActive) return undefined;
        if (await blocks.isBlockedEitherWay(userId, member.peerUserId)) return undefined;

        const timers = typingTimers.get(socket) ?? new Map<string, NodeJS.Timeout>();
        typingTimers.set(socket, timers);
        const pending = timers.get(input.conversationId);
        const payload = (isTyping: boolean) => ({
          conversationId: input.conversationId,
          userId,
          side: member.side,
          isTyping,
        });
        const peer = peerRoom(member.conversation, member.side);

        if (!input.isTyping) {
          clearTimeout(pending);
          timers.delete(input.conversationId);
          if (pending) socket.to(peer).emit(SocketEvent.Typing, payload(false));
          return undefined;
        }
        // At most one event every 3 s per user and thread, across devices and instances.
        const first = await valkey.set(
          `typing:${userId}:${input.conversationId}`,
          '1',
          'PX',
          CHAT_LIMITS.typingThrottleMs,
          'NX',
        );
        if (first === null) return undefined;
        socket.to(peer).emit(SocketEvent.Typing, payload(true));
        clearTimeout(pending);
        timers.set(
          input.conversationId,
          setTimeout(() => {
            timers.delete(input.conversationId);
            socket.to(peer).emit(SocketEvent.Typing, payload(false));
          }, CHAT_LIMITS.typingTtlSec * 1000),
        );
        return undefined;
      });

      on(SocketEvent.PresenceGet, presenceQuerySchema, async (input) => {
        const member = await chat.requireMember(userId, input.conversationId);
        if (await blocks.isBlockedEitherWay(userId, member.peerUserId)) return { online: false };
        return { online: member.isPeerActive && (await isOnline(member.peerUserId)) };
      });

      on(SocketEvent.AuthRenew, authRenewSchema, async (input) => {
        if (socket.data.mode === 'cookie' || !input.token) {
          // The cookie of a live websocket cannot change, so the web client reconnects.
          throw new AppError(409, ErrorCode.Conflict, 'Reconnect with the new cookie');
        }
        const claims = app.accessTokens.verify(input.token.replace(BEARER_PREFIX, ''));
        const revoked = claims ? (await valkey.exists(revokedSessionKey(claims.sid))) > 0 : false;
        if (!claims || revoked || claims.sub !== userId || claims.sid !== sessionId) {
          // After the ack, which the disconnect would otherwise drop.
          setImmediate(() => end(socket, AuthExpiredReason.TokenInvalid));
          throw new AppError(401, ErrorCode.Unauthenticated, 'Invalid token');
        }
        if (claims.exp <= socket.data.exp) {
          throw new AppError(409, ErrorCode.Conflict, 'That token does not extend the session');
        }
        socket.data.exp = claims.exp;
        scheduleExpiry(socket);
        return { expiresAt: new Date(claims.exp * 1000).toISOString() };
      });

      socket.on('disconnect', () => {
        clearTimeout(expiryTimers.get(socket));
        clearInterval(heartbeats.get(socket));
        for (const timer of typingTimers.get(socket)?.values() ?? []) clearTimeout(timer);
        const left = (perUser.get(userId) ?? 1) - 1;
        if (left <= 0) perUser.delete(userId);
        else perUser.set(userId, left);
        const set = bySession.get(sessionId);
        set?.delete(socket);
        if (set?.size === 0) bySession.delete(sessionId);

        background(
          (async () => {
            await valkey.zrem(presenceKey(userId), socket.id);
            if (!(await isOnline(userId))) await announcePresence(socket, false);
          })(),
        );
      });
    });

    /** The room of the other end of a thread. */
    function peerRoom(conversation: ConversationRef, side: ChatSide) {
      return side === 'user'
        ? businessRoom(conversation.businessId)
        : userRoom(conversation.userId);
    }
    const bothEnds = (conversation: ConversationRef) => [
      userRoom(conversation.userId),
      businessRoom(conversation.businessId),
    ];

    // Delivery. The chat service calls these after its transaction commits.
    const events: ChatEvents = {
      messageNew(conversation, message: Message) {
        io.to(bothEnds(conversation)).emit(SocketEvent.MessageNew, message);
      },
      messageRead(conversation, read) {
        // No read receipt reaches an account that has blocked the reader, or the reverse.
        background(
          (async () => {
            const member = await chat.requireMember(read.readerId, conversation.id);
            if (await blocks.isBlockedEitherWay(read.readerId, member.peerUserId)) return;
            io.to(bothEnds(conversation)).emit(SocketEvent.MessageRead, read);
          })(),
        );
      },
    };
    chat.events = events;

    app.addHook('preClose', async () => {
      io.local.disconnectSockets(true);
    });
    app.addHook('onClose', async () => {
      await io.close();
      // The adapter sends its unsubscribes without waiting; let them settle before quitting.
      await new Promise((resolve) => setTimeout(resolve, 100));
      await Promise.all(
        [pub, sub, revocations].map((client) =>
          client.quit().catch(() => {
            client.disconnect();
          }),
        ),
      );
    });
  },
  { name: 'realtime', dependencies: ['env', 'valkey', 'prisma', 'auth'] },
);
