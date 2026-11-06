import {
  NOTIFICATION_LIMITS,
  type NotificationNewEvent,
  type NotificationType,
  type PushData,
} from '@supporters/shared';
import type { Redis } from 'ioredis';
import type { PrismaClient } from '../../generated/prisma/client';
import { type ExpoMessage, type ExpoPushBatcher, isDeadToken } from './channels/expo';
import type { EmailSender } from './channels/email';
import { type WebPushSender, isGoneStatus } from './channels/web-push';
import { androidChannel, emailCopy, pushCopy } from './content';
import type { Delivery } from './fanout';
import { NOTIFICATION_RULES } from './rules';

/** Valkey channel the worker publishes badge counts on; the API emits them to `user:<id>`. */
export const NOTIFICATIONS_CHANNEL = 'notifications:new';

/** Expo asks to check receipts about 15 minutes after sending. */
export const RECEIPT_DELAY_MS = 15 * 60_000;

/** India has one zone and no daylight saving, so IST is a fixed UTC+05:30. */
const IST_OFFSET_MS = 330 * 60_000;
const HOUR_MS = 3_600_000;

/** The end of quiet hours (08:00 IST) if `at` falls inside them (22:00 to 08:00 IST), else null. */
export function quietHoursEnd(at: Date): Date | null {
  const { startHour, endHour } = NOTIFICATION_LIMITS.quietHours;
  const local = new Date(at.getTime() + IST_OFFSET_MS);
  const hour = local.getUTCHours();
  if (hour < startHour && hour >= endHour) return null;
  const end = new Date(local);
  end.setUTCHours(endHour, 0, 0, 0);
  if (hour >= startHour) end.setTime(end.getTime() + 24 * HOUR_MS);
  return new Date(end.getTime() - IST_OFFSET_MS);
}

/** How long to hold a push: until a batch window closes, and past quiet hours unless urgent. */
export function pushDelayMs(delivery: Delivery, now: Date): number {
  if (delivery.isUrgent) return 0;
  let sendAt = now.getTime();
  if (delivery.push === 'batched') sendAt += NOTIFICATION_LIMITS.batchWindowSec * 1000;
  const quietEnd = quietHoursEnd(new Date(sendAt));
  if (quietEnd) sendAt = quietEnd.getTime();
  return sendAt - now.getTime();
}

export interface PushJob {
  notificationId: string;
}
export interface ReceiptsJob {
  tickets: { ticketId: string; tokenId: string }[];
}
export interface EmailJob {
  notificationId: string;
}

/** The slice of a BullMQ queue the scheduler uses. */
export interface JobQueue<T> {
  add(name: string, data: T, options?: { jobId?: string; delay?: number }): Promise<unknown>;
}

/**
 * Turns a fan-out plan into push and email jobs. Job ids are derived from the
 * event and the notification, so re-scheduling after a retry adds nothing.
 */
export class DeliveryScheduler {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly valkey: Redis,
    private readonly push: JobQueue<PushJob>,
    private readonly email: JobQueue<EmailJob>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async schedule(eventId: string, deliveries: Delivery[]) {
    const now = this.now();
    for (const delivery of deliveries) {
      const { notificationId } = delivery;
      if (delivery.push) {
        const delay = pushDelayMs(delivery, now);
        // Held pushes share one job per item, so a night of messages in one thread is one push.
        const jobId = delay > 0 ? `push-${notificationId}` : `push-${notificationId}-${eventId}`;
        await this.push.add('deliver', { notificationId }, { jobId, delay });
      }
      if (delivery.email) {
        await this.email.add('send', { notificationId }, { jobId: `email-${notificationId}` });
      }
    }
    // The badge: one count per recipient, delivered by the API to their sockets.
    const latest = new Map(deliveries.map((d) => [d.userId, d.notificationId]));
    for (const [userId, notificationId] of latest) {
      const unreadCount = await this.prisma.notification.count({ where: { userId, readAt: null } });
      const event: NotificationNewEvent & { userId: string } = {
        userId,
        notificationId,
        unreadCount,
      };
      await this.valkey.publish(NOTIFICATIONS_CHANNEL, JSON.stringify(event));
    }
  }
}

export interface PushResult {
  expo: number;
  web: number;
  pruned: number;
  skipped?: 'missing' | 'read' | 'disabled';
}

/** Sends one notification to the recipient's signed-in devices and prunes dead ones. */
export class PushDelivery {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly expo: ExpoPushBatcher,
    private readonly webPush: WebPushSender | null,
    private readonly receipts: JobQueue<ReceiptsJob>,
  ) {}

  async deliver({ notificationId }: PushJob): Promise<PushResult> {
    const result: PushResult = { expo: 0, web: 0, pruned: 0 };
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });
    if (!notification) return { ...result, skipped: 'missing' };
    const type = notification.type as NotificationType;
    const rule = NOTIFICATION_RULES[type];
    if (!rule.isUrgent) {
      // Read in-app while the push was held (batch window or quiet hours): nothing to say.
      if (notification.readAt) return { ...result, skipped: 'read' };
      const off = await this.prisma.notificationPref.count({
        where: {
          userId: notification.userId,
          category: rule.category,
          channel: 'push',
          enabled: false,
        },
      });
      if (off > 0) return { ...result, skipped: 'disabled' };
    }

    // Only devices whose session is still signed in.
    const liveSession = { revokedAt: null, expiresAt: { gt: new Date() } };
    const [tokens, subscriptions] = await Promise.all([
      this.prisma.pushToken.findMany({
        where: { userId: notification.userId, session: liveSession },
        select: { id: true, token: true },
      }),
      this.webPush
        ? this.prisma.webPushSubscription.findMany({
            where: { userId: notification.userId, session: liveSession },
            select: { id: true, endpoint: true, p256dh: true, auth: true },
          })
        : Promise.resolve([]),
    ]);

    const copy = pushCopy(type, notification.actorCount);
    const data: PushData = {
      notificationId,
      type,
      targetType: notification.targetType,
      targetId: notification.targetId,
    };

    if (tokens.length > 0) {
      const messages: ExpoMessage[] = tokens.map((token) => ({
        to: token.token,
        ...copy,
        data,
        sound: 'default',
        channelId: androidChannel(rule.category),
        priority: rule.isUrgent || rule.category === 'messages' ? 'high' : 'default',
      }));
      const tickets = await this.expo.send(messages);
      const dead: string[] = [];
      const pending: ReceiptsJob['tickets'] = [];
      tickets.forEach((ticket, index) => {
        const token = tokens[index];
        if (!token) return;
        if (isDeadToken(ticket)) dead.push(token.id);
        else if (ticket.status === 'ok') pending.push({ ticketId: ticket.id, tokenId: token.id });
      });
      result.expo = pending.length;
      result.pruned += await this.pruneTokens(dead);
      if (pending.length > 0) {
        await this.receipts.add('receipts', { tickets: pending }, { delay: RECEIPT_DELAY_MS });
      }
    }

    let failure: Error | undefined;
    for (const subscription of subscriptions) {
      try {
        const status = await this.webPush?.send(
          { endpoint: subscription.endpoint, keys: subscription },
          JSON.stringify({ ...copy, data }),
          {
            ttlSec: rule.isUrgent ? 7 * 24 * 3600 : 24 * 3600,
            urgency: rule.isUrgent || rule.category === 'messages' ? 'high' : 'normal',
            ...(notification.groupKey ? { topic: topic(notification.id) } : {}),
          },
        );
        if (status !== undefined && isGoneStatus(status)) {
          await this.prisma.webPushSubscription.deleteMany({ where: { id: subscription.id } });
          result.pruned += 1;
        } else {
          result.web += 1;
        }
      } catch (error) {
        failure ??= error instanceof Error ? error : new Error('web push failed');
      }
    }
    // Retry the job only when nothing reached the user; a retry would repeat the rest.
    if (failure && result.expo === 0 && result.web === 0) throw failure;
    return result;
  }

  /** Expo's later verdict: tokens it could not deliver to because the app is gone. */
  async checkReceipts({ tickets }: ReceiptsJob): Promise<number> {
    const receipts = await this.expo.client.getReceipts(tickets.map((t) => t.ticketId));
    const dead = tickets
      .filter((t) => {
        const receipt = receipts[t.ticketId];
        return receipt !== undefined && isDeadToken(receipt);
      })
      .map((t) => t.tokenId);
    return this.pruneTokens(dead);
  }

  private async pruneTokens(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const { count } = await this.prisma.pushToken.deleteMany({ where: { id: { in: ids } } });
    return count;
  }
}

/** Web Push topics are at most 32 URL-safe characters. */
const topic = (notificationId: string) => notificationId.replaceAll('-', '');

/** Sends the email of one notification to the recipient's verified address. */
export class EmailDelivery {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly sender: EmailSender,
    private readonly appOrigin: string,
  ) {}

  async deliver({ notificationId }: EmailJob): Promise<boolean> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: {
        type: true,
        user: { select: { id: true, email: true, emailVerifiedAt: true, status: true } },
      },
    });
    if (!notification) return false;
    const { user } = notification;
    if (!user.email || !user.emailVerifiedAt || user.status === 'deleted') return false;
    const type = notification.type as NotificationType;
    const rule = NOTIFICATION_RULES[type];
    if (!rule.isUrgent) {
      const off = await this.prisma.notificationPref.count({
        where: { userId: user.id, category: rule.category, channel: 'email', enabled: false },
      });
      if (off > 0) return false;
    }
    await this.sender.send({ to: user.email, ...emailCopy(type, this.appOrigin) });
    return true;
  }
}
