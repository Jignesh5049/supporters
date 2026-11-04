import { z } from 'zod';
import { chatSideSchema, messageSchema } from './chat';

/** Socket.IO events on `/v1/ws` (backend spec, Realtime chat). Names are `noun:verb`. */
export const SocketEvent = {
  /** Client to server, with an ack. */
  MessageSend: 'message:send',
  /** Server to both ends of the thread. */
  MessageNew: 'message:new',
  /** Client to server with an ack, and server to both ends of the thread. */
  MessageRead: 'message:read',
  /** Client to server, and server to the other end only. */
  Typing: 'typing',
  /** Server to counterparts when an account goes online or offline. */
  Presence: 'presence',
  PresenceGet: 'presence:get',
  /** Mobile sends a fresh access token before the old one expires. */
  AuthRenew: 'auth:renew',
  /** Server, just before it disconnects the socket. */
  AuthExpired: 'auth:expired',
} as const;

/** Why the server ended a socket. After `token_expired` the client refreshes and reconnects. */
export const AuthExpiredReason = {
  TokenExpired: 'token_expired',
  SessionRevoked: 'session_revoked',
  TokenInvalid: 'token_invalid',
} as const;
export type AuthExpiredReason = (typeof AuthExpiredReason)[keyof typeof AuthExpiredReason];

/** Handshake error messages (`connect_error.message`). */
export const SocketAuthError = {
  Unauthorized: 'unauthorized',
  ForbiddenOrigin: 'forbidden_origin',
  TooManyConnections: 'too_many_connections',
} as const;

/** `message:send` carries the fields of `sendMessageSchema` plus these two, flat. */
export const sendEnvelopeSchema = z.looseObject({
  conversationId: z.uuid(),
  /** A UUID the client makes up; a repeat returns the first ack instead of a second message. */
  clientId: z.uuid(),
});

export const typingEventSchema = z.strictObject({
  conversationId: z.uuid(),
  isTyping: z.boolean().default(true),
});
export type TypingEvent = z.infer<typeof typingEventSchema>;

export const readEventSchema = z.strictObject({
  conversationId: z.uuid(),
  /** Default: the newest message. */
  messageId: z.uuid().optional(),
});
export type ReadEvent = z.infer<typeof readEventSchema>;

export const presenceQuerySchema = z.strictObject({ conversationId: z.uuid() });

/** Mobile only. On the web the cookie is renewed over HTTP, so the client reconnects instead. */
export const authRenewSchema = z.strictObject({ token: z.string().min(1).max(4_096).optional() });
export type AuthRenewEvent = z.infer<typeof authRenewSchema>;

// Server to client payloads

export const messageNewPayloadSchema = messageSchema;

export const messageReadPayloadSchema = z.object({
  conversationId: z.uuid(),
  /** The end that read. */
  side: chatSideSchema,
  readerId: z.uuid(),
  messageId: z.uuid(),
  readAt: z.iso.datetime(),
});
export type MessageReadPayload = z.infer<typeof messageReadPayloadSchema>;

export const typingPayloadSchema = z.object({
  conversationId: z.uuid(),
  userId: z.uuid(),
  side: chatSideSchema,
  /** False when the other end stopped, or when 5 s passed without another `typing`. */
  isTyping: z.boolean(),
});
export type TypingPayload = z.infer<typeof typingPayloadSchema>;

export const presencePayloadSchema = z.object({
  userId: z.uuid(),
  /** Set when the account that changed owns a business, so a buyer can find the thread. */
  businessId: z.uuid().nullable(),
  online: z.boolean(),
});
export type PresencePayload = z.infer<typeof presencePayloadSchema>;

export const authExpiredPayloadSchema = z.object({
  reason: z.enum(Object.values(AuthExpiredReason)),
});

/** Acks are `{ ok: true, ... }` or `{ ok: false, code }` with the same codes as the REST problems. */
export const socketErrorAckSchema = z.object({
  ok: z.literal(false),
  code: z.string(),
  message: z.string(),
  /** Seconds, on RATE_LIMITED. */
  retryAfter: z.number().optional(),
});
export type SocketErrorAck = z.infer<typeof socketErrorAckSchema>;

export const sendAckSchema = z.object({
  ok: z.literal(true),
  id: z.uuid(),
  createdAt: z.iso.datetime(),
});
export type SendAck = z.infer<typeof sendAckSchema>;
