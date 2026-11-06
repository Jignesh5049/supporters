import {
  NOTIFICATION_LIMITS,
  type RegisterPushTokenInput,
  type WebPushSubscriptionInput,
} from '@supporters/shared';
import type { PrismaClient } from '../../generated/prisma/client';
import { AppError, ErrorCode, invalidField } from '../../lib/errors';

/**
 * Push services browsers use. The worker POSTs to a subscription's endpoint, so
 * anything else (internal hosts, metadata IPs) is refused to prevent SSRF.
 */
const PUSH_SERVICE_HOSTS = [
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'push.services.mozilla.com',
  'web.push.apple.com',
  '.notify.windows.com',
  '.push.apple.com',
];

export const isPushServiceEndpoint = (endpoint: string): boolean => {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.port !== '' || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return PUSH_SERVICE_HOSTS.some((allowed) =>
    allowed.startsWith('.')
      ? host.endsWith(allowed) && host.length > allowed.length
      : host === allowed,
  );
};

/** Expo push tokens and Web Push subscriptions, each tied to the session that registered it. */
export class PushDevicesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly isWebPushEnabled: boolean,
  ) {}

  /**
   * Registers or refreshes the device. A token that belonged to another
   * account moves to this one: the device signed in as someone else.
   */
  async registerToken(userId: string, sessionId: string, input: RegisterPushTokenInput) {
    await this.prisma.$transaction(async (tx) => {
      await tx.pushToken.upsert({
        where: { token: input.token },
        create: { userId, sessionId, token: input.token, platform: input.platform },
        update: { userId, sessionId, platform: input.platform, lastUsedAt: new Date() },
      });
      const stale = await tx.pushToken.findMany({
        where: { userId },
        orderBy: { lastUsedAt: 'desc' },
        skip: NOTIFICATION_LIMITS.pushTokensPerUser,
        select: { id: true },
      });
      if (stale.length > 0) {
        await tx.pushToken.deleteMany({ where: { id: { in: stale.map((row) => row.id) } } });
      }
    });
  }

  /** Someone else's token is left alone, without saying so. */
  async deleteToken(userId: string, token: string) {
    await this.prisma.pushToken.deleteMany({ where: { userId, token } });
  }

  async subscribeWeb(userId: string, sessionId: string, input: WebPushSubscriptionInput) {
    if (!this.isWebPushEnabled) {
      throw new AppError(503, ErrorCode.ServiceUnavailable, 'Web push is not available');
    }
    if (!isPushServiceEndpoint(input.endpoint)) {
      throw invalidField('body.endpoint', 'Not a known push service');
    }
    const keys = { p256dh: input.keys.p256dh, auth: input.keys.auth };
    await this.prisma.$transaction(async (tx) => {
      await tx.webPushSubscription.upsert({
        where: { endpoint: input.endpoint },
        create: { userId, sessionId, endpoint: input.endpoint, ...keys },
        update: { userId, sessionId, ...keys, lastUsedAt: new Date() },
      });
      const stale = await tx.webPushSubscription.findMany({
        where: { userId },
        orderBy: { lastUsedAt: 'desc' },
        skip: NOTIFICATION_LIMITS.webPushSubscriptionsPerUser,
        select: { id: true },
      });
      if (stale.length > 0) {
        await tx.webPushSubscription.deleteMany({
          where: { id: { in: stale.map((row) => row.id) } },
        });
      }
    });
  }

  async unsubscribeWeb(userId: string, endpoint: string) {
    await this.prisma.webPushSubscription.deleteMany({ where: { userId, endpoint } });
  }
}
