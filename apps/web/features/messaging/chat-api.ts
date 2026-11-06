import {
  type BlockState,
  type Conversation,
  type CreateEnquiryInput,
  type Enquiry,
  type EnquiryStatus,
  type Message,
  type Page,
  type ReadState,
  type SendMessageInput,
  type UpdateConversationInput,
  blockStateSchema,
  conversationSchema,
  enquirySchema,
  messageSchema,
  pageSchema,
  readStateSchema,
} from '@supporters/shared';
import { api } from '@/lib/api/client';

/**
 * Browser calls for chat, enquiries and blocks. Every response is validated
 * with the shared schemas; the API authorizes each call and the client adds
 * the CSRF header. Writes that may be retried carry an `Idempotency-Key`.
 */

type Path = `/v1/${string}`;

function withQuery(path: Path, params: Record<string, string | undefined>): Path {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  return query.size > 0 ? `${path}?${query}` : path;
}

const conversationPage = pageSchema(conversationSchema);
const messagePage = pageSchema(messageSchema);
const enquiryPage = pageSchema(enquirySchema);

export interface InboxQuery {
  q?: string;
  hidden?: boolean;
  cursor?: string;
  limit?: number;
}

export interface MessagesQuery {
  /** Pages back through history, newest first. */
  cursor?: string;
  /** Catches up after this message, oldest first. */
  after?: string;
  limit?: number;
}

export interface BusinessEnquiriesQuery {
  status?: EnquiryStatus;
  cursor?: string;
}

export const chatApi = {
  conversations: async ({ q, hidden, cursor, limit }: InboxQuery = {}): Promise<
    Page<Conversation>
  > =>
    conversationPage.parse(
      await api.request(
        withQuery('/v1/conversations', {
          q,
          cursor,
          hidden: hidden ? 'true' : undefined,
          limit: limit ? String(limit) : undefined,
        }),
      ),
    ),

  /** Opens the one thread with a business, or returns the existing one. */
  open: async (businessId: string): Promise<Conversation> =>
    conversationSchema.parse(
      await api.request('/v1/conversations', { method: 'POST', body: { businessId } }),
    ),

  update: async (conversationId: string, body: UpdateConversationInput): Promise<Conversation> =>
    conversationSchema.parse(
      await api.request(`/v1/conversations/${conversationId}`, { method: 'PATCH', body }),
    ),

  messages: async (
    conversationId: string,
    { cursor, after, limit }: MessagesQuery = {},
  ): Promise<Page<Message>> =>
    messagePage.parse(
      await api.request(
        withQuery(`/v1/conversations/${conversationId}/messages`, {
          cursor,
          after,
          limit: limit ? String(limit) : undefined,
        }),
      ),
    ),

  /** The REST fallback for `message:send`. The key is the message's clientId. */
  send: async (
    conversationId: string,
    clientId: string,
    body: SendMessageInput,
  ): Promise<Message> =>
    messageSchema.parse(
      await api.request(`/v1/conversations/${conversationId}/messages`, {
        method: 'POST',
        body,
        headers: { 'idempotency-key': clientId },
      }),
    ),

  markRead: async (conversationId: string, messageId?: string): Promise<ReadState> =>
    readStateSchema.parse(
      await api.request(`/v1/conversations/${conversationId}/read`, {
        method: 'POST',
        body: messageId ? { messageId } : {},
      }),
    ),

  deleteForMe: (messageId: string) =>
    api.request(`/v1/messages/${messageId}`, { method: 'DELETE' }),

  setBlocked: async (userId: string, isBlocked: boolean): Promise<BlockState> =>
    blockStateSchema.parse(
      await api.request(`/v1/blocks/${userId}`, { method: isBlocked ? 'PUT' : 'DELETE' }),
    ),

  createEnquiry: async (idempotencyKey: string, body: CreateEnquiryInput): Promise<Enquiry> =>
    enquirySchema.parse(
      await api.request('/v1/enquiries', {
        method: 'POST',
        body,
        headers: { 'idempotency-key': idempotencyKey },
      }),
    ),

  myEnquiries: async (cursor?: string): Promise<Page<Enquiry>> =>
    enquiryPage.parse(await api.request(withQuery('/v1/me/enquiries', { cursor }))),

  businessEnquiries: async ({ status, cursor }: BusinessEnquiriesQuery = {}): Promise<
    Page<Enquiry>
  > =>
    enquiryPage.parse(
      await api.request(withQuery('/v1/me/business/enquiries', { status, cursor })),
    ),

  closeEnquiry: async (enquiryId: string): Promise<Enquiry> =>
    enquirySchema.parse(
      await api.request(`/v1/me/business/enquiries/${enquiryId}`, {
        method: 'PATCH',
        body: { status: 'closed' },
      }),
    ),
};

/** Where a chat file opens: the API redirects members to a short-lived signed URL. */
export const attachmentHref = (attachmentId: string) => `/v1/attachments/${attachmentId}`;
