import {
  LOCKED_NOTIFICATION_CATEGORIES,
  NotificationCategory,
  NotificationChannel,
  type MarkNotificationsReadInput,
  type Notification,
  type NotificationPrefs,
  type NotificationsPage,
  type NotificationsQuery,
  type UpdateNotificationPrefsInput,
} from '@supporters/shared';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { pageArgs, splitPage } from '../../lib/pagination';

const notificationInclude = {
  actor: { select: { id: true, name: true } },
} satisfies Prisma.NotificationInclude;
type NotificationRow = Prisma.NotificationGetPayload<{ include: typeof notificationInclude }>;

const toNotification = (row: NotificationRow): Notification => ({
  id: row.id,
  type: row.type as Notification['type'],
  category: row.category,
  actor: row.actor,
  actorCount: row.actorCount,
  target: { type: row.targetType as Notification['target']['type'], id: row.targetId },
  readAt: row.readAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/** The in-app list, read state and preferences. Every query is scoped to the signed-in user. */
export class NotificationsService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(userId: string, query: NotificationsQuery): Promise<NotificationsPage> {
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.notification.findMany({
      ...page,
      where: {
        ...page.where,
        userId,
        ...(query.category ? { category: query.category } : {}),
      },
      include: notificationInclude,
    });
    const split = splitPage(rows, query.limit);
    return {
      data: split.rows.map(toNotification),
      nextCursor: split.nextCursor,
      unreadCount: await this.unreadCount(userId),
    };
  }

  unreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, readAt: null } });
  }

  /** Ids that are not the user's are ignored, so the call never reveals whether they exist. */
  async markRead(userId: string, input: MarkNotificationsReadInput): Promise<number> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null, ...('ids' in input ? { id: { in: input.ids } } : {}) },
      data: { readAt: new Date() },
    });
    return this.unreadCount(userId);
  }

  /** Every category and channel; a channel is on unless the user switched it off. */
  async getPrefs(userId: string): Promise<NotificationPrefs> {
    const off = await this.prisma.notificationPref.findMany({
      where: { userId, enabled: false },
      select: { category: true, channel: true },
    });
    const prefs = Object.values(NotificationCategory).flatMap((category) => {
      const isLocked = LOCKED_NOTIFICATION_CATEGORIES.includes(category);
      return Object.values(NotificationChannel).map((channel) => ({
        category,
        channel,
        enabled:
          isLocked || !off.some((row) => row.category === category && row.channel === channel),
        isLocked,
      }));
    });
    return { prefs };
  }

  async updatePrefs(
    userId: string,
    input: UpdateNotificationPrefsInput,
  ): Promise<NotificationPrefs> {
    await this.prisma.$transaction(
      input.prefs.map(({ category, channel, enabled }) =>
        this.prisma.notificationPref.upsert({
          where: { userId_category_channel: { userId, category, channel } },
          create: { userId, category, channel, enabled },
          update: { enabled },
        }),
      ),
    );
    return this.getPrefs(userId);
  }
}
