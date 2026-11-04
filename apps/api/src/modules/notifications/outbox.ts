import type { Prisma } from '../../generated/prisma/client';

/**
 * Domain events (`entity.verb`, past tense) and their payloads. Payloads carry
 * ids only, never message text, names or contact details: the worker loads
 * what it needs when it fans the event out.
 */
export interface DomainEvents {
  'enquiry.created': { enquiryId: string };
  /** The business answered the enquiry for the first time. */
  'enquiry.replied': { enquiryId: string; messageId: string };
  'message.created': { messageId: string };
  'follow.created': { userId: string; businessId: string };
  'post.liked': { userId: string; postId: string };
  'comment.created': { commentId: string };
  'security.login': { userId: string; sessionId: string };
  'security.password_changed': { userId: string };
}
export type DomainEventType = keyof DomainEvents;

export const DOMAIN_EVENT_TYPES = [
  'enquiry.created',
  'enquiry.replied',
  'message.created',
  'follow.created',
  'post.liked',
  'comment.created',
  'security.login',
  'security.password_changed',
] as const satisfies readonly DomainEventType[];

/**
 * Writes the event into `outbox_events` with the caller's transaction, so the
 * event exists exactly when the change it describes commits (transactional
 * outbox; backend spec, Notification pipeline).
 */
export async function recordEvent<T extends DomainEventType>(
  tx: Prisma.TransactionClient,
  type: T,
  payload: DomainEvents[T],
): Promise<void> {
  await tx.outboxEvent.create({ data: { type, payload } });
}

export async function recordEvents<T extends DomainEventType>(
  tx: Prisma.TransactionClient,
  type: T,
  payloads: DomainEvents[T][],
): Promise<void> {
  if (payloads.length === 0) return;
  await tx.outboxEvent.createMany({ data: payloads.map((payload) => ({ type, payload })) });
}
