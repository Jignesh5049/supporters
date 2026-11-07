import {
  type ChatAttachment,
  type ChatSide,
  type Conversation,
  type EnquiryStatus,
  type ListingCard,
  MEDIA_LIMITS,
  type Message,
} from '@supporters/shared';
import type { PendingMessage } from '@/lib/socket/chat-socket';
import { ASK_FOR_PRICE, formatMoney, truncate, unitLabel } from '@/lib/catalog/format';
import { businessPath, productPath, servicePath } from '@/lib/catalog/seo';
import { attachmentHref } from './chat-api';

/** The other end of a thread, as the inbox and thread header show it. */
export interface PeerView {
  /** The account to block: the user, or the business's owner (blocking works on users). */
  kind: 'business' | 'user';
  userId: string | null;
  name: string;
  avatarUrl: string | null;
  /** The public business page; users have none. */
  href: string | null;
  subtitle: string | null;
  isVerified: boolean;
}

export function peerOf(conversation: Conversation): PeerView {
  if (conversation.side === 'user') {
    const { business } = conversation;
    return {
      kind: 'business',
      userId: null,
      name: business.name,
      avatarUrl: business.logo?.url ?? null,
      href: businessPath(business.slug),
      subtitle: business.city.name,
      isVerified: business.isVerified,
    };
  }
  return {
    kind: 'user',
    userId: conversation.user.id,
    name: conversation.user.name,
    avatarUrl: null,
    href: null,
    subtitle: `Buyer · enquiring ${conversation.business.name}`,
    isVerified: false,
  };
}

const IST = 'Asia/Kolkata';
const timeOfDay = new Intl.DateTimeFormat('en-IN', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: IST,
});
const dayMonth = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  timeZone: IST,
});
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: IST });

/** `10:05 am` today, `Yesterday`, else `3 Nov` (India time, so server and browser agree). */
export function formatInboxTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const today = dayKey.format(now);
  if (dayKey.format(date) === today) return timeOfDay.format(date);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (dayKey.format(date) === dayKey.format(yesterday)) return 'Yesterday';
  return dayMonth.format(date);
}

export const formatMessageTime = (iso: string) => timeOfDay.format(new Date(iso));

/** The one-line preview under a conversation's name. */
export function messagePreview(message: Message | null, side: ChatSide): string {
  if (!message) return 'No messages yet';
  const mine = message.senderSide === side ? 'You: ' : '';
  switch (message.type) {
    case 'image':
      return `${mine}${message.attachments.length > 1 ? `${message.attachments.length} photos` : 'Photo'}${message.body ? ` · ${truncate(message.body, 60)}` : ''}`;
    case 'file':
      return `${mine}PDF document`;
    case 'listing_card':
      return `${mine}${message.listing ? message.listing.title : 'A listing'}`;
    case 'enquiry':
      return `${mine}Enquiry: ${truncate(message.body, 60)}`;
    case 'quote':
      return `${mine}Quote${message.quote ? `: ${formatMoney(message.quote.price)}` : ''}`;
    default:
      return `${mine}${truncate(message.body, 80)}`;
  }
}

export const ENQUIRY_STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: 'New',
  responded: 'Responded',
  closed: 'Closed',
};

export interface AttachmentView {
  id: string;
  /** Opens through the API, which answers members with a 5-minute signed URL. */
  href: string;
  isImage: boolean;
  label: string;
}

export interface ListingCardView {
  title: string;
  href: string;
  priceText: string;
  imageUrl: string | null;
}

export type DeliveryState = 'sending' | 'failed' | 'sent' | 'read';

export interface MessageView {
  /** The stored id, or the clientId while it is still pending. */
  key: string;
  id: string | null;
  clientId: string;
  isMine: boolean;
  type: Message['type'];
  body: string;
  time: string;
  createdAt: string;
  attachments: AttachmentView[];
  listing: ListingCardView | null;
  enquiry: { statusLabel: string; quantityText: string | null } | null;
  /** A business's quote on a buyer requirement. */
  quote: { priceText: string; requirementHref: string } | null;
  /** Only for my own messages. */
  delivery: DeliveryState | null;
  error: string | null;
}

function toAttachmentView(attachment: ChatAttachment): AttachmentView {
  const isImage = (MEDIA_LIMITS.imageTypes as readonly string[]).includes(attachment.contentType);
  const megabytes = attachment.size / (1024 * 1024);
  return {
    id: attachment.id,
    href: attachmentHref(attachment.id),
    isImage,
    label: isImage
      ? 'Photo'
      : `PDF document · ${megabytes < 0.1 ? '<0.1' : megabytes.toFixed(1)} MB`,
  };
}

export function toListingCardView(listing: ListingCard): ListingCardView {
  return {
    title: listing.title,
    href: listing.type === 'product' ? productPath(listing.id) : servicePath(listing.id),
    priceText: listing.price ? formatMoney(listing.price) : ASK_FOR_PRICE,
    imageUrl: listing.image?.url ?? null,
  };
}

export function quantityText(quantity: number | null, unit: string | null): string | null {
  if (quantity === null) return null;
  return unit ? `${quantity} ${unitLabel(unit)}` : String(quantity);
}

export function toMessageView(
  message: Message,
  side: ChatSide,
  isReadByPeer: boolean,
): MessageView {
  const isMine = message.senderSide === side;
  return {
    key: message.id,
    id: message.id,
    clientId: message.clientId,
    isMine,
    type: message.type,
    body: message.body,
    time: formatMessageTime(message.createdAt),
    createdAt: message.createdAt,
    attachments: message.attachments.map(toAttachmentView),
    listing: message.listing ? toListingCardView(message.listing) : null,
    enquiry: message.enquiry
      ? {
          statusLabel: ENQUIRY_STATUS_LABELS[message.enquiry.status],
          quantityText: quantityText(message.enquiry.quantity, message.enquiry.unit),
        }
      : null,
    quote: message.quote
      ? {
          priceText: formatMoney(message.quote.price),
          requirementHref: `/requirements/${message.quote.requirementId}`,
        }
      : null,
    delivery: isMine ? (isReadByPeer ? 'read' : 'sent') : null,
    error: null,
  };
}

/** Copy for a send the API refused. */
export function sendErrorText(pending: PendingMessage): string | null {
  if (pending.status !== 'failed' || !pending.error) return null;
  switch (pending.error.code) {
    case 'BLOCKED':
      return 'You can’t message this conversation.';
    case 'RATE_LIMITED':
      return pending.error.retryAfter
        ? `Sending too fast. Try again in ${pending.error.retryAfter} s.`
        : 'Sending too fast. Wait a moment.';
    case 'VALIDATION_FAILED':
      return 'This message can’t be sent.';
    default:
      return 'Not sent.';
  }
}

function pendingView(pending: PendingMessage): MessageView {
  return {
    key: pending.clientId,
    id: pending.id ?? null,
    clientId: pending.clientId,
    isMine: true,
    type: pending.input.type,
    body: pending.input.body,
    time: formatMessageTime(pending.createdAt),
    createdAt: pending.createdAt,
    // The files show once the stored message arrives; until then the caption carries it.
    attachments: [],
    listing: null,
    enquiry: null,
    quote: null,
    delivery:
      pending.status === 'failed' ? 'failed' : pending.status === 'sent' ? 'sent' : 'sending',
    error: sendErrorText(pending),
  };
}

/**
 * What a thread renders, oldest first: the stored messages (newest first from
 * the cache) plus this thread's pending sends that the cache doesn't hold yet.
 * A pending message and its stored copy share a clientId, so it shows once.
 * My messages up to the peer's read pointer show as read.
 */
export function threadView(
  conversation: Pick<Conversation, 'id' | 'side' | 'peerLastReadMessageId'>,
  messages: readonly Message[],
  pending: readonly PendingMessage[],
): MessageView[] {
  const stored = [...messages].reverse();
  const readIndex = conversation.peerLastReadMessageId
    ? stored.findIndex((message) => message.id === conversation.peerLastReadMessageId)
    : -1;
  const views = stored.map((message, index) =>
    toMessageView(message, conversation.side, index <= readIndex),
  );
  const storedClientIds = new Set(messages.map((message) => message.clientId));
  const storedIds = new Set(messages.map((message) => message.id));
  const waiting = pending
    .filter(
      (item) =>
        item.conversationId === conversation.id &&
        !storedClientIds.has(item.clientId) &&
        !(item.id && storedIds.has(item.id)),
    )
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(pendingView);
  return [...views, ...waiting];
}

/** The clientIds of pending sends the cache now holds, so the outbox can let them go. */
export function settledClientIds(
  messages: readonly Message[],
  pending: readonly PendingMessage[],
): string[] {
  const stored = new Set(messages.map((message) => message.clientId));
  return pending.filter((item) => stored.has(item.clientId)).map((item) => item.clientId);
}

/** The newest message from the other end, which is what "read" points at. */
export function newestFromPeer(messages: readonly Message[], side: ChatSide): Message | null {
  return messages.find((message) => message.senderSide !== side) ?? null;
}

/**
 * The account to block. For a buyer that is the business's owner, known from
 * the owner's messages (the API has no owner id on the conversation yet).
 */
export function peerUserIdOf(
  conversation: Pick<Conversation, 'side' | 'user'>,
  messages: readonly Message[],
): string | null {
  if (conversation.side === 'business') return conversation.user.id;
  return messages.find((message) => message.senderSide === 'business')?.senderId ?? null;
}
