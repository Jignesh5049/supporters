import {
  blockStateSchema,
  conversationSchema,
  markReadSchema,
  messageSchema,
  openConversationSchema,
  pageSchema,
  readStateSchema,
  sendMessageSchema,
  updateConversationSchema,
  type BlockState,
  type Conversation,
  type Message,
  type Page,
  type ReadState,
  type SendMessageInput,
  type UpdateConversationInput,
} from '@supporters/shared';
import { z } from 'zod';
import type { ApiClient } from './client';
import { seg, toQueryString } from './query-string';

export interface ConversationsQuery {
  cursor?: string;
  limit?: number;
  /** Searches the other end's name. */
  q?: string;
  hidden?: boolean;
}

export interface MessagesQuery {
  /** Pages back through history, newest first. */
  cursor?: string;
  /** Catches up after this message id, oldest first. */
  after?: string;
  limit?: number;
}

/** The send body before Zod fills its defaults (body '', no attachments). */
export type SendMessageDraft = z.input<typeof sendMessageSchema>;

export interface ChatApi {
  conversations(query?: ConversationsQuery): Promise<Page<Conversation>>;
  /** Opens or returns the one thread with a business. */
  open(businessId: string): Promise<Conversation>;
  update(id: string, data: UpdateConversationInput): Promise<Conversation>;
  messages(conversationId: string, query?: MessagesQuery): Promise<Page<Message>>;
  /** REST fallback for the socket. `clientId` is sent as the Idempotency-Key. */
  send(conversationId: string, clientId: string, data: SendMessageDraft): Promise<Message>;
  markRead(conversationId: string, messageId?: string): Promise<ReadState>;
  deleteForMe(messageId: string): Promise<void>;
  /** A 5-minute signed link to a private chat file; never stored or shown. */
  attachmentUrl(attachmentPath: string): Promise<string>;
  setBlocked(userId: string, isBlocked: boolean): Promise<BlockState>;
}

/** Attachment paths come from the API as `/v1/attachments/<uuid>`; nothing else is followed. */
const ATTACHMENT_PATH = /^\/v1\/attachments\/[0-9a-f-]{36}$/i;

export function createChatApi(client: ApiClient): ChatApi {
  return {
    conversations: ({ hidden, ...query } = {}) =>
      client.request(
        `/conversations${toQueryString({ ...query, hidden: hidden ? 'true' : undefined })}`,
        { schema: pageSchema(conversationSchema) },
      ),
    open: (businessId) =>
      client.request('/conversations', {
        method: 'POST',
        body: openConversationSchema.parse({ businessId }),
        schema: conversationSchema,
      }),
    update: (id, data) =>
      client.request(`/conversations/${seg(id)}`, {
        method: 'PATCH',
        body: updateConversationSchema.parse(data),
        schema: conversationSchema,
      }),
    messages: (conversationId, query = {}) =>
      client.request(
        `/conversations/${seg(conversationId)}/messages${toQueryString({ ...query })}`,
        {
          schema: pageSchema(messageSchema),
        },
      ),
    send: (conversationId, clientId, data) =>
      client.request(`/conversations/${seg(conversationId)}/messages`, {
        method: 'POST',
        headers: { 'Idempotency-Key': z.uuid().parse(clientId) },
        body: sendMessageSchema.parse(data) satisfies SendMessageInput,
        schema: messageSchema,
      }),
    markRead: (conversationId, messageId) =>
      client.request(`/conversations/${seg(conversationId)}/read`, {
        method: 'POST',
        body: markReadSchema.parse({ messageId }),
        schema: readStateSchema,
      }),
    deleteForMe: (messageId) => client.request(`/messages/${seg(messageId)}`, { method: 'DELETE' }),
    attachmentUrl: async (attachmentPath) => {
      if (!ATTACHMENT_PATH.test(attachmentPath)) throw new Error('Not an attachment path');
      // The client's base URL already ends in /v1.
      return client.resolveRedirect(attachmentPath.replace(/^\/v1/, ''));
    },
    setBlocked: (userId, isBlocked) =>
      client.request(`/blocks/${seg(userId)}`, {
        method: isBlocked ? 'PUT' : 'DELETE',
        schema: blockStateSchema,
      }),
  };
}
