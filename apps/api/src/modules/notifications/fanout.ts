import {
  NOTIFICATION_LIMITS,
  NotificationTargetType,
  NotificationType,
  type NotificationChannel,
} from '@supporters/shared';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { matchRequirement } from '../requirements/requirements.matching';
import { DOMAIN_EVENT_TYPES, type DomainEventType, type DomainEvents } from './outbox';
import { NOTIFICATION_RULES, type NotificationRule } from './rules';

/** One recipient's notification, before preferences and batching. */
interface Intent {
  userId: string;
  type: NotificationType;
  actorUserId: string | null;
  targetType: NotificationTargetType;
  targetId: string | null;
  groupKey: string | null;
  /** The recipient muted the thread: in-app only. */
  isMuted?: boolean;
}

/** What to send for one in-app item. The worker turns these into push and email jobs. */
export interface Delivery {
  notificationId: string;
  userId: string;
  /** `now`: push at once. `batched`: push once the batch window ends. */
  push: 'now' | 'batched' | null;
  email: boolean;
  /** Ignores quiet hours. */
  isUrgent: boolean;
  /** False when the event only grew an existing batched item. */
  isNew: boolean;
}

interface OutboxRow {
  id: string;
  type: string;
  payload: unknown;
  processedAt: Date | null;
  fanout: Delivery[] | null;
}

const isKnownType = (type: string): type is DomainEventType =>
  (DOMAIN_EVENT_TYPES as readonly string[]).includes(type);

/**
 * Turns one outbox event into in-app notifications and a delivery plan, in one
 * transaction that also marks the event processed. Running it again for the
 * same event returns the stored plan without writing anything, so a retried
 * job never doubles a notification.
 */
export class NotificationFanout {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async process(eventId: string): Promise<Delivery[]> {
    return this.prisma.$transaction(async (tx) => {
      const [event] = await tx.$queryRaw<OutboxRow[]>`
        SELECT id, type, payload, processed_at AS "processedAt", fanout
        FROM outbox_events WHERE id = ${eventId}::uuid FOR UPDATE`;
      if (!event) return [];
      if (event.processedAt) return event.fanout ?? [];

      const intents = isKnownType(event.type)
        ? await this.resolve(tx, event.type, event.payload as never)
        : [];
      const deliveries: Delivery[] = [];
      for (const intent of intents) {
        const delivery = await this.deliver(tx, intent);
        if (delivery) deliveries.push(delivery);
      }
      await tx.outboxEvent.update({
        where: { id: event.id },
        data: { processedAt: this.now(), fanout: deliveries as unknown as Prisma.InputJsonValue },
      });
      return deliveries;
    });
  }

  /** Who hears about the event. Rows deleted since the event resolve to nobody. */
  private async resolve<T extends DomainEventType>(
    tx: Prisma.TransactionClient,
    type: T,
    payload: DomainEvents[T],
  ): Promise<Intent[]> {
    switch (type) {
      case 'message.created': {
        const { messageId } = payload as DomainEvents['message.created'];
        const message = await tx.message.findUnique({
          where: { id: messageId },
          select: {
            senderUserId: true,
            senderSide: true,
            conversation: {
              select: {
                id: true,
                userId: true,
                business: { select: { ownerUserId: true } },
                states: { select: { side: true, muted: true } },
              },
            },
          },
        });
        if (!message) return [];
        const { conversation } = message;
        const toBusiness = message.senderSide === 'user';
        const recipientSide = toBusiness ? 'business' : 'user';
        return [
          {
            userId: toBusiness ? conversation.business.ownerUserId : conversation.userId,
            type: NotificationType.MessageNew,
            actorUserId: message.senderUserId,
            targetType: NotificationTargetType.Conversation,
            targetId: conversation.id,
            groupKey: `${NotificationType.MessageNew}:${conversation.id}`,
            isMuted: conversation.states.some((s) => s.side === recipientSide && s.muted),
          },
        ];
      }
      case 'enquiry.created':
      case 'enquiry.replied': {
        const { enquiryId } = payload as DomainEvents['enquiry.created'];
        const enquiry = await tx.enquiry.findUnique({
          where: { id: enquiryId },
          select: { id: true, userId: true, business: { select: { ownerUserId: true } } },
        });
        if (!enquiry) return [];
        const isReply = type === 'enquiry.replied';
        return [
          {
            userId: isReply ? enquiry.userId : enquiry.business.ownerUserId,
            type: isReply ? NotificationType.EnquiryReplied : NotificationType.EnquiryNew,
            actorUserId: isReply ? enquiry.business.ownerUserId : enquiry.userId,
            targetType: NotificationTargetType.Enquiry,
            targetId: enquiry.id,
            groupKey: null,
          },
        ];
      }
      case 'follow.created': {
        const { userId, businessId } = payload as DomainEvents['follow.created'];
        const business = await tx.business.findUnique({
          where: { id: businessId },
          select: { ownerUserId: true },
        });
        if (!business) return [];
        return [
          {
            userId: business.ownerUserId,
            type: NotificationType.FollowNew,
            actorUserId: userId,
            targetType: NotificationTargetType.Business,
            targetId: businessId,
            groupKey: `${NotificationType.FollowNew}:${businessId}`,
          },
        ];
      }
      case 'post.liked': {
        const { userId, postId } = payload as DomainEvents['post.liked'];
        const post = await tx.post.findUnique({
          where: { id: postId },
          select: { business: { select: { ownerUserId: true } } },
        });
        if (!post) return [];
        return [
          {
            userId: post.business.ownerUserId,
            type: NotificationType.PostLiked,
            actorUserId: userId,
            targetType: NotificationTargetType.Post,
            targetId: postId,
            groupKey: `${NotificationType.PostLiked}:${postId}`,
          },
        ];
      }
      case 'comment.created': {
        const { commentId } = payload as DomainEvents['comment.created'];
        const comment = await tx.comment.findUnique({
          where: { id: commentId },
          select: {
            userId: true,
            postId: true,
            parentId: true,
            deletedAt: true,
            parent: { select: { userId: true } },
            post: { select: { business: { select: { ownerUserId: true } } } },
          },
        });
        if (!comment || comment.deletedAt) return [];
        const ownerUserId = comment.post.business.ownerUserId;
        const parentAuthorId = comment.parent?.userId ?? null;
        const intents: Intent[] = [];
        if (comment.parentId && parentAuthorId) {
          intents.push({
            userId: parentAuthorId,
            type: NotificationType.CommentReplied,
            actorUserId: comment.userId,
            targetType: NotificationTargetType.Post,
            targetId: comment.postId,
            groupKey: `${NotificationType.CommentReplied}:${comment.parentId}`,
          });
        }
        // An owner replying under their own comment hears about it once, as a reply.
        if (ownerUserId !== parentAuthorId) {
          intents.push({
            userId: ownerUserId,
            type: NotificationType.PostCommented,
            actorUserId: comment.userId,
            targetType: NotificationTargetType.Post,
            targetId: comment.postId,
            groupKey: `${NotificationType.PostCommented}:${comment.postId}`,
          });
        }
        return intents;
      }
      case 'review.created': {
        const { reviewId } = payload as DomainEvents['review.created'];
        const review = await tx.review.findUnique({
          where: { id: reviewId },
          select: { userId: true, businessId: true, business: { select: { ownerUserId: true } } },
        });
        if (!review) return [];
        return [
          {
            userId: review.business.ownerUserId,
            type: NotificationType.ReviewNew,
            actorUserId: review.userId,
            targetType: NotificationTargetType.Business,
            targetId: review.businessId,
            groupKey: `${NotificationType.ReviewNew}:${review.businessId}`,
          },
        ];
      }
      case 'requirement.created': {
        const { requirementId } = payload as DomainEvents['requirement.created'];
        const match = await matchRequirement(tx, requirementId, this.now());
        if (!match) return [];
        return match.notifyUserIds.map((userId) => ({
          userId,
          type: NotificationType.RequirementMatched,
          actorUserId: match.buyerUserId,
          targetType: NotificationTargetType.Requirement,
          targetId: requirementId,
          groupKey: null,
        }));
      }
      case 'requirement.quoted': {
        const { quoteId } = payload as DomainEvents['requirement.quoted'];
        const quote = await tx.requirementQuote.findUnique({
          where: { id: quoteId },
          select: {
            requirement: { select: { id: true, userId: true } },
            business: { select: { ownerUserId: true } },
          },
        });
        if (!quote) return [];
        return [
          {
            userId: quote.requirement.userId,
            type: NotificationType.RequirementQuoted,
            actorUserId: quote.business.ownerUserId,
            targetType: NotificationTargetType.Requirement,
            targetId: quote.requirement.id,
            groupKey: null,
          },
        ];
      }
      case 'security.login':
      case 'security.password_changed': {
        const { userId } = payload as DomainEvents['security.login'];
        return [
          {
            userId,
            type:
              type === 'security.login'
                ? NotificationType.SecurityLogin
                : NotificationType.SecurityPasswordChanged,
            actorUserId: null,
            targetType: NotificationTargetType.Account,
            targetId: null,
            groupKey: null,
          },
        ];
      }
      default:
        return [];
    }
  }

  /** Writes or grows the in-app item and decides push and email, or skips the intent. */
  private async deliver(tx: Prisma.TransactionClient, intent: Intent): Promise<Delivery | null> {
    const rule = NOTIFICATION_RULES[intent.type];
    if (intent.actorUserId === intent.userId) return null;

    const recipient = await tx.user.findUnique({
      where: { id: intent.userId },
      select: {
        status: true,
        email: true,
        emailVerifiedAt: true,
        notificationPrefs: { where: { category: rule.category, enabled: false } },
      },
    });
    if (!recipient || recipient.status === 'deleted') return null;
    if (recipient.status !== 'active' && !rule.isUrgent) return null;
    if (intent.actorUserId) {
      const blocked = await tx.block.findFirst({
        where: {
          OR: [
            { blockerId: intent.userId, blockedId: intent.actorUserId },
            { blockerId: intent.actorUserId, blockedId: intent.userId },
          ],
        },
        select: { id: true },
      });
      if (blocked) return null;
    }

    const { id: notificationId, isNew } = await this.upsert(tx, intent, rule.category);

    const isOn = (channel: NotificationChannel) =>
      rule.isUrgent || !recipient.notificationPrefs.some((pref) => pref.channel === channel);
    let push: Delivery['push'] = null;
    if (rule.push && !intent.isMuted && isOn('push')) {
      // A batch pushes once, when its window ends; later events only grow it.
      if (!rule.isBatched) push = 'now';
      else if (isNew) push = 'batched';
    }
    const email =
      rule.email &&
      isNew &&
      isOn('email') &&
      recipient.email !== null &&
      !!recipient.emailVerifiedAt;
    return { notificationId, userId: intent.userId, push, email, isUrgent: rule.isUrgent, isNew };
  }

  /**
   * Grows the recipient's unread item with the same group key from the last
   * batch window, or adds a new one. An advisory lock per (recipient, key)
   * keeps concurrent jobs from opening two batches.
   */
  private async upsert(
    tx: Prisma.TransactionClient,
    intent: Intent,
    category: NotificationRule['category'],
  ): Promise<{ id: string; isNew: boolean }> {
    if (intent.groupKey) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${intent.userId}:${intent.groupKey}`}, 0))`;
      const windowStart = new Date(
        this.now().getTime() - NOTIFICATION_LIMITS.batchWindowSec * 1000,
      );
      const open = await tx.notification.findFirst({
        where: {
          userId: intent.userId,
          groupKey: intent.groupKey,
          readAt: null,
          createdAt: { gt: windowStart },
        },
        orderBy: { id: 'desc' },
        select: { id: true, actorUserId: true },
      });
      if (open) {
        await tx.notification.update({
          where: { id: open.id },
          data: {
            actorUserId: intent.actorUserId,
            // The same person again (unlike, like) is not one more person.
            ...(open.actorUserId !== intent.actorUserId ? { actorCount: { increment: 1 } } : {}),
          },
        });
        return { id: open.id, isNew: false };
      }
    }
    const created = await tx.notification.create({
      data: {
        userId: intent.userId,
        type: intent.type,
        category,
        actorUserId: intent.actorUserId,
        targetType: intent.targetType,
        targetId: intent.targetId,
        groupKey: intent.groupKey,
        createdAt: this.now(),
      },
      select: { id: true },
    });
    return { id: created.id, isNew: true };
  }
}
