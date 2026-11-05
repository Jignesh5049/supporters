import { randomUUID } from 'node:crypto';
import { NOTIFICATION_LIMITS, NotificationSocketEvent } from '@supporters/shared';
import { Queue } from 'bullmq';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanupNotifications } from '../../jobs/cleanup';
import { type NotificationWorker, QUEUE, startNotificationWorker } from '../../jobs/worker';
import { type ReferenceData, call, referenceData } from '../../test/catalog';
import { openThread, ownerAndBuyer, sendText } from '../../test/chat';
import {
  type MobileSession,
  PASSWORD,
  type TestContext,
  createTestApp,
  nextIp,
  prisma,
  registerMobile,
  resetState,
  valkey,
} from '../../test/helpers';
import {
  FakeEmail,
  FakeExpo,
  FakeWebPush,
  clearOutbox,
  drainOutbox,
  vapidEnv,
} from '../../test/notifications';
import { ownerWithPost } from '../../test/social';
import { connect, listen } from '../../test/socket';
import { ExpoPushBatcher } from './channels/expo';
import {
  DeliveryScheduler,
  EmailDelivery,
  type JobQueue,
  NOTIFICATIONS_CHANNEL,
  PushDelivery,
  type PushJob,
  type ReceiptsJob,
  pushDelayMs,
  quietHoursEnd,
} from './delivery';
import { type Delivery, NotificationFanout } from './fanout';
import { isPushServiceEndpoint } from './push-devices.service';

let ctx: TestContext;
let refs: ReferenceData;

beforeAll(async () => {
  ctx = await createTestApp(vapidEnv());
  refs = await referenceData();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(resetState);
afterEach(() => {
  vi.restoreAllMocks();
});

const token = (n: number | string) => `ExponentPushToken[test-token-${n}-aaaaaaaa]`;
const registerToken = (as: MobileSession, value: string, platform = 'android') =>
  call(ctx, 'POST', '/v1/me/push-tokens', { as, body: { token: value, platform } });
const subscription = (endpoint = `https://fcm.googleapis.com/fcm/send/${randomUUID()}`) => ({
  endpoint,
  expirationTime: null,
  keys: { p256dh: `B${'a'.repeat(86)}`, auth: 'b'.repeat(22) },
});
/** 'HH:MM' India time on 2026-11-04, as a Date. */
const ist = (time: string, day = '2026-11-04') => new Date(`${day}T${time}:00+05:30`);

/** Collects queued jobs instead of running them. */
class RecordingQueue<T> implements JobQueue<T> {
  readonly jobs: { name: string; data: T; options: { jobId?: string; delay?: number } }[] = [];
  async add(name: string, data: T, options: { jobId?: string; delay?: number } = {}) {
    this.jobs.push({ name, data, options });
  }
}

describe('push devices API', () => {
  it('registers a token for the signed-in session, and moves it with the device', async () => {
    const [alice, bob] = [await registerMobile(ctx), await registerMobile(ctx)];
    expect((await registerToken(alice, token(1))).statusCode).toBe(204);
    expect((await registerToken(alice, token(1), 'ios')).statusCode).toBe(204);
    let rows = await prisma.pushToken.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: alice.user.id, platform: 'ios' });

    // The phone signed in as Bob: Alice's pushes must stop reaching it.
    await registerToken(bob, token(1));
    rows = await prisma.pushToken.findMany();
    expect(rows.map((row) => row.userId)).toEqual([bob.user.id]);
  });

  it('keeps the newest tokens per account', async () => {
    const alice = await registerMobile(ctx);
    for (let i = 0; i <= NOTIFICATION_LIMITS.pushTokensPerUser; i += 1) {
      await registerToken(alice, token(i));
    }
    const rows = await prisma.pushToken.findMany({ orderBy: { lastUsedAt: 'asc' } });
    expect(rows).toHaveLength(NOTIFICATION_LIMITS.pushTokensPerUser);
    expect(rows.map((row) => row.token)).not.toContain(token(0));
  });

  it("deletes only the caller's own token", async () => {
    const [alice, bob] = [await registerMobile(ctx), await registerMobile(ctx)];
    await registerToken(alice, token('a'));
    const removed = await call(ctx, 'DELETE', '/v1/me/push-tokens', {
      as: bob,
      body: { token: token('a') },
    });
    expect(removed.statusCode).toBe(204);
    expect(await prisma.pushToken.count()).toBe(1);
    await call(ctx, 'DELETE', '/v1/me/push-tokens', { as: alice, body: { token: token('a') } });
    expect(await prisma.pushToken.count()).toBe(0);
  });

  it('rejects guests and malformed tokens', async () => {
    const alice = await registerMobile(ctx);
    const guest = await call(ctx, 'POST', '/v1/me/push-tokens', {
      body: { token: token(1), platform: 'android' },
    });
    expect(guest.statusCode).toBe(401);
    expect(
      (await call(ctx, 'DELETE', '/v1/me/push-tokens', { body: { token: token(1) } })).statusCode,
    ).toBe(401);
    for (const body of [
      { token: 'not-a-token', platform: 'android' },
      { token: token(1), platform: 'web' },
      { token: token(1), platform: 'android', userId: randomUUID() },
    ]) {
      const response = await call(ctx, 'POST', '/v1/me/push-tokens', { as: alice, body });
      expect(response.statusCode).toBe(400);
    }
  });

  it('accepts web push only to known push services', async () => {
    const alice = await registerMobile(ctx);
    const subscribe = (body: object) =>
      call(ctx, 'POST', '/v1/me/web-push-subscriptions', { as: alice, body });

    expect((await subscribe(subscription())).statusCode).toBe(204);
    expect(
      (await subscribe(subscription('https://wns2-bl2p.notify.windows.com/w/?token=x'))).statusCode,
    ).toBe(204);
    for (const endpoint of [
      'http://fcm.googleapis.com/fcm/send/x',
      'https://169.254.169.254/latest/meta-data',
      'https://localhost/push',
      'https://evil.example/push',
      'https://fcm.googleapis.com.evil.example/x',
      'https://fcm.googleapis.com:8443/x',
      'https://user:pw@fcm.googleapis.com/x',
      'https://notify.windows.com/x',
    ]) {
      expect((await subscribe(subscription(endpoint))).statusCode, endpoint).toBe(400);
    }
    expect(
      (await subscribe({ ...subscription(), keys: { p256dh: 'x', auth: 'y' } })).statusCode,
    ).toBe(400);
    expect(await prisma.webPushSubscription.count()).toBe(2);
    expect(isPushServiceEndpoint('https://web.push.apple.com/QGx')).toBe(true);
  });

  it("unsubscribes only the caller's own browser", async () => {
    const [alice, bob] = [await registerMobile(ctx), await registerMobile(ctx)];
    const body = subscription();
    await call(ctx, 'POST', '/v1/me/web-push-subscriptions', { as: alice, body });
    const url = '/v1/me/web-push-subscriptions';
    await call(ctx, 'DELETE', url, { as: bob, body: { endpoint: body.endpoint } });
    expect(await prisma.webPushSubscription.count()).toBe(1);
    await call(ctx, 'DELETE', url, { as: alice, body: { endpoint: body.endpoint } });
    expect(await prisma.webPushSubscription.count()).toBe(0);
    expect((await call(ctx, 'POST', url, { body })).statusCode).toBe(401);
  });

  it('serves the VAPID public key, and refuses subscriptions when web push is off', async () => {
    const key = await call(ctx, 'GET', '/v1/notifications/vapid-public-key');
    expect(key.json()).toEqual({ publicKey: ctx.env.VAPID_PUBLIC_KEY });

    const off = await createTestApp();
    try {
      expect((await call(off, 'GET', '/v1/notifications/vapid-public-key')).json()).toEqual({
        publicKey: null,
      });
      const alice = await registerMobile(off);
      const response = await call(off, 'POST', '/v1/me/web-push-subscriptions', {
        as: alice,
        body: subscription(),
      });
      expect(response.statusCode).toBe(503);
    } finally {
      await off.app.close();
    }
  });
});

describe('quiet hours', () => {
  it('runs from 22:00 to 08:00 India time', () => {
    expect(quietHoursEnd(ist('21:59'))).toBeNull();
    expect(quietHoursEnd(ist('08:00'))).toBeNull();
    expect(quietHoursEnd(ist('22:00'))).toEqual(ist('08:00', '2026-11-05'));
    expect(quietHoursEnd(ist('23:30'))).toEqual(ist('08:00', '2026-11-05'));
    expect(quietHoursEnd(ist('03:00'))).toEqual(ist('08:00'));
    expect(quietHoursEnd(ist('07:59'))).toEqual(ist('08:00'));
  });

  it('defers non-urgent push to 08:00, holds batches for the window, and never holds security', () => {
    const delivery = (overrides: Partial<Delivery>): Delivery => ({
      notificationId: randomUUID(),
      userId: randomUUID(),
      push: 'now',
      email: false,
      isUrgent: false,
      isNew: true,
      ...overrides,
    });
    const minutes = (ms: number) => ms / 60_000;
    expect(pushDelayMs(delivery({}), ist('12:00'))).toBe(0);
    expect(minutes(pushDelayMs(delivery({}), ist('23:00')))).toBe(9 * 60);
    expect(minutes(pushDelayMs(delivery({ push: 'batched' }), ist('12:00')))).toBe(10);
    // The window would close inside quiet hours.
    expect(minutes(pushDelayMs(delivery({ push: 'batched' }), ist('21:55')))).toBe(10 * 60 + 5);
    expect(pushDelayMs(delivery({ isUrgent: true }), ist('23:00'))).toBe(0);
  });

  it('queues the held push with its delay and publishes the badge count', async () => {
    const { owner, buyer, business } = await ownerAndBuyer(ctx, refs);
    const threadId = await openThread(ctx, buyer, business.id);
    await clearOutbox();
    await sendText(ctx, buyer, threadId, 'Late night question');
    await sendText(ctx, buyer, threadId, 'And another');
    await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      headers: { 'x-client': 'mobile' },
      payload: { identifier: owner.phone, password: PASSWORD },
      remoteAddress: nextIp(),
    });

    const night = () => ist('23:00');
    const push = new RecordingQueue<PushJob>();
    const email = new RecordingQueue<{ notificationId: string }>();
    const scheduler = new DeliveryScheduler(prisma, valkey, push, email, night);
    const subscriber = valkey.duplicate();
    const published: unknown[] = [];
    await subscriber.subscribe(NOTIFICATIONS_CHANNEL);
    subscriber.on('message', (_channel: string, message: string) => {
      published.push(JSON.parse(message));
    });
    try {
      const events = await prisma.outboxEvent.findMany({ orderBy: { id: 'asc' } });
      for (const event of events) {
        await scheduler.schedule(event.id, await drainOne(event.id, night));
      }
      await vi.waitFor(() => expect(published).toHaveLength(3));
    } finally {
      await subscriber.quit();
    }

    const [first, second, security] = push.jobs;
    // Both messages share one held job, so the owner gets one push at 08:00.
    expect(first?.options).toEqual({
      jobId: `push-${first?.data.notificationId}`,
      delay: 9 * 3600_000,
    });
    expect(second?.options.jobId).toBe(first?.options.jobId);
    expect(security?.options.delay).toBe(0);
    expect(published.at(-1)).toMatchObject({ userId: owner.user.id, unreadCount: 2 });
  });
});

/** Fans out one event at a pinned time. */
const drainOne = (eventId: string, now: () => Date) =>
  new NotificationFanout(prisma, now).process(eventId);

describe('push delivery', () => {
  let expo: FakeExpo;
  let web: FakeWebPush;
  let receipts: RecordingQueue<ReceiptsJob>;
  let push: PushDelivery;

  beforeEach(() => {
    expo = new FakeExpo();
    web = new FakeWebPush();
    receipts = new RecordingQueue<ReceiptsJob>();
    push = new PushDelivery(prisma, new ExpoPushBatcher(expo, 1), web, receipts);
  });

  /** A follow notification for a fresh owner, and that owner. */
  async function followNotification() {
    const { session: owner, business } = await ownerWithPost(ctx, refs);
    const fan = await registerMobile(ctx);
    await clearOutbox();
    await call(ctx, 'PUT', `/v1/follows/${business.id}`, { as: fan });
    const [delivery] = await drainOutbox();
    if (!delivery) throw new Error('no delivery');
    return { owner, fan, notificationId: delivery.notificationId };
  }

  it('sends ids and generic copy to signed-in devices only', async () => {
    const { owner, notificationId } = await followNotification();
    await registerToken(owner, token('live'));
    await call(ctx, 'POST', '/v1/me/web-push-subscriptions', { as: owner, body: subscription() });
    // A second device whose session was signed out.
    const other = await registerMobile(ctx);
    await registerToken(other, token('revoked'));
    await prisma.pushToken.update({
      where: { token: token('revoked') },
      data: { userId: owner.user.id },
    });
    await prisma.session.updateMany({
      where: { userId: other.user.id },
      data: { revokedAt: new Date() },
    });

    const result = await push.deliver({ notificationId });
    expect(result).toMatchObject({ expo: 1, web: 1, pruned: 0 });
    expect(expo.messages.map((m) => m.to)).toEqual([token('live')]);
    const [message] = expo.messages;
    expect(message).toMatchObject({
      title: 'New followers',
      body: 'Someone followed your business',
      channelId: 'activity',
      data: { notificationId, type: 'follow.new', targetType: 'business' },
    });
    expect(Object.keys(message?.data ?? {}).sort()).toEqual([
      'notificationId',
      'targetId',
      'targetType',
      'type',
    ]);
    // No names: the follower is "Asha Traders" in the test data.
    expect(JSON.stringify(expo.sent)).not.toContain('Asha');
    expect(JSON.parse(web.sent[0]?.payload ?? '{}')).toMatchObject({ data: { notificationId } });
    expect(receipts.jobs[0]?.options.delay).toBe(15 * 60_000);
  });

  it('prunes tokens Expo rejects, at send time and from receipts', async () => {
    const { owner, notificationId } = await followNotification();
    await registerToken(owner, token('gone'));
    await registerToken(owner, token('later'));
    await registerToken(owner, token('fine'));
    expo.ticketFor = (message, index) =>
      message.to === token('gone')
        ? { status: 'error', details: { error: 'DeviceNotRegistered' } }
        : { status: 'ok', id: `t-${index}` };

    expect((await push.deliver({ notificationId })).pruned).toBe(1);
    const tickets = receipts.jobs[0]?.data.tickets ?? [];
    expect(tickets).toHaveLength(2);
    const laterToken = await prisma.pushToken.findUniqueOrThrow({
      where: { token: token('later') },
    });
    for (const ticket of tickets) {
      expo.receipts[ticket.ticketId] =
        ticket.tokenId === laterToken.id
          ? { status: 'error', details: { error: 'DeviceNotRegistered' } }
          : { status: 'ok' };
    }
    expect(await push.checkReceipts({ tickets })).toBe(1);
    expect((await prisma.pushToken.findMany()).map((row) => row.token)).toEqual([token('fine')]);
  });

  it('prunes expired web push subscriptions', async () => {
    const { owner, notificationId } = await followNotification();
    await call(ctx, 'POST', '/v1/me/web-push-subscriptions', { as: owner, body: subscription() });
    web.status = 410;
    expect(await push.deliver({ notificationId })).toMatchObject({ web: 0, pruned: 1 });
    expect(await prisma.webPushSubscription.count()).toBe(0);
  });

  it('skips a held push the user already read or switched off', async () => {
    const { owner, notificationId } = await followNotification();
    await registerToken(owner, token(1));
    await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
    expect((await push.deliver({ notificationId })).skipped).toBe('read');

    await prisma.notification.update({ where: { id: notificationId }, data: { readAt: null } });
    await call(ctx, 'PUT', '/v1/me/notification-prefs', {
      as: owner,
      body: { prefs: [{ category: 'business', channel: 'push', enabled: false }] },
    });
    expect((await push.deliver({ notificationId })).skipped).toBe('disabled');
    expect(expo.sent).toEqual([]);
  });

  it('batches the messages of concurrent jobs into one Expo request', async () => {
    const batcher = new ExpoPushBatcher(expo, 20);
    const message = (to: string) => ({
      to,
      title: 't',
      body: 'b',
      data: { notificationId: randomUUID(), type: 'x', targetType: 'post', targetId: null },
      sound: 'default' as const,
      channelId: 'activity',
      priority: 'default' as const,
    });
    const tickets = await Promise.all(
      Array.from({ length: 150 }, (_, i) => batcher.send([message(token(i))])),
    );
    expect(tickets).toHaveLength(150);
    expect(expo.sent.map((batch) => batch.length)).toEqual([100, 50]);
  });
});

describe('email delivery', () => {
  it('emails a verified address with no enquiry text, and nobody else', async () => {
    const { owner, buyer, productId } = await ownerAndBuyer(ctx, refs);
    await prisma.user.update({
      where: { id: owner.user.id },
      data: { email: 'owner@example.test', emailVerifiedAt: new Date() },
    });
    await clearOutbox();
    const enquiry = await ctx.app.inject({
      method: 'POST',
      url: '/v1/enquiries',
      headers: { authorization: `Bearer ${buyer.accessToken}`, 'idempotency-key': randomUUID() },
      payload: { productId, message: 'Secret volumes for our Pune plant.' },
      remoteAddress: nextIp(),
    });
    expect(enquiry.statusCode).toBe(201);
    const [delivery] = await drainOutbox();
    expect(delivery?.email).toBe(true);

    const sender = new FakeEmail();
    const emails = new EmailDelivery(prisma, sender, ctx.env.APP_ORIGIN);
    expect(await emails.deliver({ notificationId: delivery?.notificationId ?? '' })).toBe(true);
    expect(sender.sent).toEqual([
      expect.objectContaining({ to: 'owner@example.test', subject: 'Supporters: New enquiry' }),
    ]);
    expect(sender.sent[0]?.text).toContain(`${ctx.env.APP_ORIGIN}/business/enquiries`);
    expect(JSON.stringify(sender.sent)).not.toContain('Secret');

    await prisma.user.update({ where: { id: owner.user.id }, data: { emailVerifiedAt: null } });
    expect(await emails.deliver({ notificationId: delivery?.notificationId ?? '' })).toBe(false);
  });
});

describe('cleanup', () => {
  it('deletes notifications after 90 days and processed outbox rows after a week', async () => {
    const user = await registerMobile(ctx);
    const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 3600_000);
    const notification = (createdAt: Date) =>
      prisma.notification.create({
        data: {
          userId: user.user.id,
          type: 'security.login',
          category: 'account',
          targetType: 'account',
          createdAt,
        },
      });
    const old = await notification(daysAgo(NOTIFICATION_LIMITS.retentionDays + 1));
    const recent = await notification(daysAgo(NOTIFICATION_LIMITS.retentionDays - 1));
    await clearOutbox();
    const processed = await prisma.outboxEvent.create({
      data: { type: 'post.liked', payload: {}, processedAt: daysAgo(8) },
    });
    const pending = await prisma.outboxEvent.create({
      data: { type: 'post.liked', payload: {}, createdAt: daysAgo(30) },
    });

    expect(await cleanupNotifications(prisma)).toEqual({ notifications: 1, outbox: 1 });
    expect((await prisma.notification.findMany()).map((n) => n.id)).toEqual([recent.id]);
    expect((await prisma.outboxEvent.findMany()).map((e) => e.id)).toEqual([pending.id]);
    expect(old.id).not.toBe(processed.id);
  });
});

describe('worker', () => {
  let worker: NotificationWorker | undefined;
  let expo: FakeExpo;
  let email: FakeEmail;
  let prefix: string;

  beforeEach(async () => {
    expo = new FakeExpo();
    email = new FakeEmail();
    prefix = `test-${randomUUID()}`;
    worker = await startNotificationWorker({
      env: ctx.env,
      prisma,
      valkey,
      expo,
      webPush: null,
      email,
      log: ctx.app.log,
      backoffMs: 5,
      relayIntervalMs: 20,
      prefix,
      isCleanupScheduled: false,
      // Midday in India, outside quiet hours.
      now: () => ist('12:00'),
    });
  });
  // Close before the next test's reset, so no job writes while the tables are truncated.
  afterEach(async () => {
    await worker?.close();
    worker = undefined;
  });

  it('relays the outbox, fans out, pushes and updates the badge on the socket', async () => {
    const { owner, buyer, business } = await ownerAndBuyer(ctx, refs);
    await registerToken(owner, token('owner'));
    const threadId = await openThread(ctx, buyer, business.id);

    const url = await listen(ctx.app);
    const socket = await connect(url, { token: owner.accessToken });
    const badge = new Promise((resolve) => socket.once(NotificationSocketEvent.New, resolve));

    await sendText(ctx, buyer, threadId, 'Is this in stock?');
    await vi.waitFor(() => expect(expo.messages.map((m) => m.to)).toContain(token('owner')), {
      timeout: 10_000,
    });
    expect(await badge).toMatchObject({ unreadCount: expect.any(Number) });
    expect(JSON.stringify(expo.sent)).not.toContain('stock');
    expect(await prisma.outboxEvent.count({ where: { processedAt: null } })).toBe(0);
    socket.disconnect();
  });

  it('retries a failing email and dead-letters it after five tries', async () => {
    const user = await registerMobile(ctx);
    await prisma.user.update({
      where: { id: user.user.id },
      data: { email: 'me@example.test', emailVerifiedAt: new Date() },
    });
    email.error = new Error('SES throttled');
    await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      headers: { 'x-client': 'mobile' },
      payload: { identifier: user.phone, password: PASSWORD },
      remoteAddress: nextIp(),
    });

    const deadLetters = new Queue(QUEUE.deadLetter, { connection: valkey, prefix });
    try {
      await vi.waitFor(
        async () => expect((await deadLetters.getJobs(['waiting'])).length).toBeGreaterThan(0),
        { timeout: 15_000, interval: 100 },
      );
      const [letter] = await deadLetters.getJobs(['waiting']);
      expect(letter?.data).toMatchObject({
        queue: 'email',
        name: 'send',
        attemptsMade: 5,
        failedReason: 'SES throttled',
      });
      expect(JSON.stringify(letter?.data)).not.toContain('me@example.test');
    } finally {
      await deadLetters.close();
    }
  });
});
