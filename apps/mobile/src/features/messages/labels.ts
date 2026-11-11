import type { EnquiryStatus, Message } from '@supporters/shared';
import { formatPrice } from '../social/mappers';

export const ENQUIRY_STATUS_LABEL: Record<EnquiryStatus, string> = {
  new: 'New',
  responded: 'Responded',
  closed: 'Closed',
};

/** One line for the inbox. Never the file names or the enquiry's details. */
export function messagePreview(message: Message | null, isMine: boolean): string {
  if (!message) return 'No messages yet';
  const prefix = isMine ? 'You: ' : '';
  switch (message.type) {
    case 'text':
      return `${prefix}${message.body}`;
    case 'image':
      return `${prefix}${message.attachments.length > 1 ? `${message.attachments.length} photos` : 'Photo'}`;
    case 'file':
      return `${prefix}PDF document`;
    case 'listing_card':
      return `${prefix}${message.listing?.title ?? 'Listing'}`;
    case 'enquiry':
      return `${prefix}Enquiry${message.listing ? `: ${message.listing.title}` : ''}`;
    case 'quote':
      return `${prefix}Quote${message.quote ? `: ${formatPrice(message.quote.price)}` : ''}`;
    default:
      return '';
  }
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/** "10:42", "Yesterday", or "4 Nov" in the inbox. */
export function inboxTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (sameDay(date, now)) {
    return date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function bubbleTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export function fileSizeLabel(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Reasons a message could not be sent, in plain words. */
const SEND_FAILURES: Record<string, string> = {
  BLOCKED: "You can't message in this conversation.",
  NOT_FOUND: 'This conversation is no longer available.',
  VALIDATION_FAILED: "This message couldn't be sent.",
  IDEMPOTENCY_KEY_REUSED: "This message couldn't be sent. Write it again.",
  FORBIDDEN: "You can't message in this conversation.",
};

export function sendFailureMessage(code: string | undefined): string {
  return (code && SEND_FAILURES[code]) || 'Not sent. Tap to retry.';
}
