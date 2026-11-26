import type { PremiumActivatedEvent, PremiumRefundedEvent } from '@supporters/shared';
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
  /** An admin approved a verification request. */
  'business.verified': { verificationId: string };
  'business.verification_rejected': { verificationId: string };
  /** Moderation hid a post, comment, message or business page of `userId`. */
  'content.hidden': { userId: string; targetType: string; targetId: string };
  'account.warned': { userId: string; reportId: string };
  /** A buyer posted a requirement; its fan-out runs the matching. */
  'requirement.created': { requirementId: string };
  'requirement.quoted': { quoteId: string };
  'review.created': { reviewId: string };
  /** Premium module -> referrals: the business paid (starts the 7-day refund window). */
  'premium.activated': PremiumActivatedEvent;
  /** Premium module -> referrals: a payment was refunded (inside the window: Ineligible). */
  'premium.refunded': PremiumRefundedEvent;
  'referral.pending': { referralId: string };
  'referral.credited': { referralId: string };
  'referral.ineligible': { referralId: string };
  'withdrawal.approved': { withdrawalId: string };
  'withdrawal.paid': { withdrawalId: string };
  'withdrawal.rejected': { withdrawalId: string };
  'withdrawal.failed': { withdrawalId: string };
  /** Approved: the worker's payouts job sends it to RazorpayX. Not a notification. */
  'payout.requested': { withdrawalId: string };
  'security.payout_details_changed': { userId: string };
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
  'business.verified',
  'business.verification_rejected',
  'content.hidden',
  'account.warned',
  'requirement.created',
  'requirement.quoted',
  'review.created',
  'premium.activated',
  'premium.refunded',
  'referral.pending',
  'referral.credited',
  'referral.ineligible',
  'withdrawal.approved',
  'withdrawal.paid',
  'withdrawal.rejected',
  'withdrawal.failed',
  'payout.requested',
  'security.payout_details_changed',
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
