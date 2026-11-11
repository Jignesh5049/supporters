import { z } from 'zod';
import { CHAT_LIMITS, MEDIA_LIMITS, TEXT_LIMITS } from '../limits';
import { businessSummarySchema } from './business';
import { moneySchema, paginationQuerySchema } from './common';
import { userRefSchema } from './social';
import { mediaSchema } from './uploads';

/** Which end of a thread: the user, or the business (answered by its owner). */
export const ChatSide = { User: 'user', Business: 'business' } as const;
export type ChatSide = (typeof ChatSide)[keyof typeof ChatSide];
export const chatSideSchema = z.enum(Object.values(ChatSide));

export const MessageType = {
  Text: 'text',
  Image: 'image',
  File: 'file',
  ListingCard: 'listing_card',
  Enquiry: 'enquiry',
  /** A business's quote on a buyer requirement (POST /buyer-requirements/:id/quotes). */
  Quote: 'quote',
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];
export const messageTypeSchema = z.enum(Object.values(MessageType));

/** Types a client may send; enquiries and quotes have their own endpoints. */
export const SENDABLE_MESSAGE_TYPES = ['text', 'image', 'file', 'listing_card'] as const;

export const listingRefSchema = z.strictObject({
  type: z.enum(['product', 'service']),
  id: z.uuid(),
});
export type ListingRef = z.infer<typeof listingRefSchema>;

/**
 * What a client sends, over REST or the socket. Text needs a body; images
 * (1 to 5) and one PDF come from `chat` uploads, with an optional caption; a
 * listing card points at a product or service.
 */
export const sendMessageSchema = z
  .strictObject({
    type: z.enum(SENDABLE_MESSAGE_TYPES),
    body: z.string().trim().max(TEXT_LIMITS.message.max).default(''),
    /** Ready uploads with purpose `chat`, never raw files or keys. */
    attachmentIds: z
      .array(z.uuid())
      .max(MEDIA_LIMITS.imagesPerMessage.max)
      .refine((ids) => new Set(ids).size === ids.length, { message: 'Each file may appear once' })
      .default([]),
    listing: listingRefSchema.optional(),
  })
  .superRefine((input, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });
    const count = input.attachmentIds.length;
    if (input.type === 'text') {
      if (input.body.length === 0) issue('body', 'Write a message');
      if (count > 0) issue('attachmentIds', 'Text messages have no attachments');
    }
    if (input.type === 'image' && count < 1) issue('attachmentIds', 'Attach 1 to 5 images');
    if (input.type === 'file' && count !== CHAT_LIMITS.documentsPerMessage) {
      issue('attachmentIds', 'Attach exactly one PDF');
    }
    if (input.type === 'listing_card' && !input.listing) issue('listing', 'Pick a listing');
    if (input.type !== 'listing_card' && input.listing) {
      issue('listing', 'Only listing cards carry a listing');
    }
    if (input.type === 'listing_card' && count > 0) {
      issue('attachmentIds', 'Listing cards have no attachments');
    }
  });
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/** The REST fallback takes its clientId from the Idempotency-Key header (a UUID). */
export const idempotencyKeyHeaderSchema = z.looseObject({ 'idempotency-key': z.uuid() });

export const conversationIdParamsSchema = z.strictObject({ id: z.uuid() });
export const messageIdParamsSchema = z.strictObject({ id: z.uuid() });
export const attachmentParamsSchema = z.strictObject({ id: z.uuid() });

/** `cursor` pages back through history (newest first); `after` catches up (oldest first). */
export const messagesQuerySchema = paginationQuerySchema
  .extend({ after: z.uuid().optional() })
  .refine((query) => query.cursor === undefined || query.after === undefined, {
    message: 'Use either cursor or after',
    path: ['after'],
  });
export type MessagesQuery = z.infer<typeof messagesQuerySchema>;

export const chatAttachmentSchema = z.object({
  id: z.uuid(),
  contentType: z.string(),
  size: z.number().int(),
  /** Path that answers with a redirect to a short-lived signed URL; sign in to follow it. */
  url: z.string(),
});
export type ChatAttachment = z.infer<typeof chatAttachmentSchema>;

/** The product or service on a listing card; null once it is no longer public. */
export const listingCardSchema = z.object({
  type: z.enum(['product', 'service']),
  id: z.uuid(),
  title: z.string(),
  price: moneySchema.nullable(),
  image: mediaSchema.nullable(),
});
export type ListingCard = z.infer<typeof listingCardSchema>;

export const EnquiryStatus = { New: 'new', Responded: 'responded', Closed: 'closed' } as const;
export type EnquiryStatus = (typeof EnquiryStatus)[keyof typeof EnquiryStatus];
export const enquiryStatusSchema = z.enum(Object.values(EnquiryStatus));

/** The enquiry an `enquiry` message carries. */
export const messageEnquirySchema = z.object({
  id: z.uuid(),
  status: enquiryStatusSchema,
  quantity: z.number().int().nullable(),
  unit: z.string().nullable(),
});

export const messageSchema = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  senderSide: chatSideSchema,
  senderId: z.uuid(),
  clientId: z.uuid(),
  type: messageTypeSchema,
  body: z.string(),
  attachments: z.array(chatAttachmentSchema),
  listing: listingCardSchema.nullable(),
  enquiry: messageEnquirySchema.nullable(),
  createdAt: z.iso.datetime(),
});
export type Message = z.infer<typeof messageSchema>;

export const conversationSchema = z.object({
  id: z.uuid(),
  user: userRefSchema,
  business: businessSummarySchema,
  /** The signed-in viewer's end of the thread. */
  side: chatSideSchema,
  lastMessage: messageSchema.nullable(),
  unreadCount: z.number().int(),
  muted: z.boolean(),
  hidden: z.boolean(),
  /** The viewer's read pointer, and the other end's (for "read" ticks). */
  lastReadMessageId: z.uuid().nullable(),
  peerLastReadMessageId: z.uuid().nullable(),
  lastMessageAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
});
export type Conversation = z.infer<typeof conversationSchema>;

export const openConversationSchema = z.strictObject({ businessId: z.uuid() });
export type OpenConversationInput = z.infer<typeof openConversationSchema>;

export const conversationsQuerySchema = paginationQuerySchema.extend({
  /** Searches the other end's name. */
  q: z.string().trim().min(1).max(CHAT_LIMITS.searchQueryMax).optional(),
  /** Hidden threads are left out unless asked for. */
  hidden: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});
export type ConversationsQuery = z.infer<typeof conversationsQuerySchema>;

export const updateConversationSchema = z
  .strictObject({ muted: z.boolean().optional(), hidden: z.boolean().optional() })
  .refine((input) => input.muted !== undefined || input.hidden !== undefined, {
    message: 'Send muted, hidden or both',
  });
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;

/** Marks everything up to `messageId` (default: the newest message) as read. */
export const markReadSchema = z.strictObject({ messageId: z.uuid().optional() });
export type MarkReadInput = z.infer<typeof markReadSchema>;

export const readStateSchema = z.object({ lastReadMessageId: z.uuid().nullable() });
export type ReadState = z.infer<typeof readStateSchema>;
