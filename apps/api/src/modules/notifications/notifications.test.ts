import { randomUUID } from 'node:crypto';
import { NOTIFICATION_LIMITS } from '@supporters/shared';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { type ReferenceData, call, referenceData, signUpOwner } from '../../test/catalog';
import {
  openThread,
  ownerAndBuyer,
  postWithKey,
  publishedProduct,
  sendText,
} from '../../test/chat';
import {
  type MobileSession,
  PASSWORD,
  type TestContext,
  createTestApp,
  nextIp,
  prisma,
  registerMobile,
  resetState,
  sendOtp,
} from '../../test/helpers';
import { clearOutbox, drainOutbox, inboxOf, outboxOf } from '../../test/notifications';
import { ownerWithPost } from '../../test/social';
import { NotificationFanout } from './fanout';

let ctx: TestContext;
let refs: ReferenceData;

beforeAll(async () => {
  ctx = await createTestApp();
  refs = await referenceData();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(resetState);
afterEach(() => {
  vi.restoreAllMocks();
});

const like = (as: MobileSession, postId: string) =>
  call(ctx, 'PUT', `/v1/posts/${postId}/like`, { as });
const minutesFromNow = (minutes: number) => () => new Date(Date.now() + minutes * 60_000);

describe('outbox', () => {
  it('writes each domain event in the transaction of its change', async () => {
    const { session: owner, business, postId } = await ownerWithPost(ctx, refs);
    const fan = await registerMobile(ctx);

    expect((await like(fan, postId)).statusCode).toBe(200);
    await like(fan, postId); // already liked: no new event
    await call(ctx, 'PUT', `/v1/follows/${business.id}`, { as: fan });
    const comment = await call(ctx, 'POST', `/v1/posts/${postId}/comments`, {
      as: fan,
      body: { body: 'Nice' },
    });

    expect((await outboxOf('post.liked')).map((e) => e.payload)).toEqual([
      { userId: fan.user.id, postId },
    ]);
    expect((await outboxOf('follow.created')).map((e) => e.payload)).toEqual([
      { userId: fan.user.id, businessId: business.id },
    ]);
    expect((await outboxOf('comment.created')).map((e) => e.payload)).toEqual([
      { commentId: comment.json<{ id: string }>().id },
    ]);
    // Every sign-in so far (registerMobile signs in once per account).
    expect((await outboxOf('security.login')).map((e) => e.payload)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: owner.user.id }),
        expect.objectContaining({ userId: fan.user.id }),
      ]),
    );
  });

  it('rolls the event back with a failed change, and the change back with a failed event', async () => {
    const { business, postId } = await ownerWithPost(ctx, refs);
    const fan = await registerMobile(ctx);

    vi.spyOn(ctx.app.services.posts, 'adjustCounter').mockRejectedValueOnce(new Error('boom'));
    expect((await like(fan, postId)).statusCode).toBe(500);
    expect(await prisma.like.count()).toBe(0);
    expect(await outboxOf('post.liked')).toEqual([]);

    vi.spyOn(ctx.app.services.businesses, 'adjustFollowerCount').mockRejectedValueOnce(
      new Error('boom'),
    );
    const follow = await call(ctx, 'PUT', `/v1/follows/${business.id}`, { as: fan });
    expect(follow.statusCode).toBe(500);
    expect(await prisma.follow.count()).toBe(0);
    expect(await outboxOf('follow.created')).toEqual([]);

    // The outbox insert itself fails: the like must not stay behind.
    await prisma.$executeRawUnsafe(
      `CREATE OR REPLACE FUNCTION test_fail_outbox() RETURNS trigger AS $$
       BEGIN RAISE EXCEPTION 'outbox down'; END $$ LANGUAGE plpgsql`,
    );
    await prisma.$executeRawUnsafe(
      'CREATE TRIGGER test_fail_outbox BEFORE INSERT ON outbox_events FOR EACH ROW EXECUTE FUNCTION test_fail_outbox()',
    );
    try {
      expect((await like(fan, postId)).statusCode).toBe(500);
      expect(await prisma.like.count()).toBe(0);
      expect((await prisma.post.findUniqueOrThrow({ where: { id: postId } })).likeCount).toBe(0);
    } finally {
      await prisma.$executeRawUnsafe('DROP TRIGGER test_fail_outbox ON outbox_events');
      await prisma.$executeRawUnsafe('DROP FUNCTION test_fail_outbox()');
    }
  });

  it('announces an enquiry once, its first owner reply, and other messages', async () => {
    const { owner, buyer, productId, business } = await ownerAndBuyer(ctx, refs);
    const enquiry = await postWithKey(ctx, buyer, '/v1/enquiries', {
      productId,
      message: 'We need 500 units delivered to Pune next month.',
    });
    expect(enquiry.statusCode).toBe(201);
    const enquiryId = enquiry.json<{ id: string }>().id;
    const threadId = await openThread(ctx, buyer, business.id);

    expect((await outboxOf('enquiry.created')).map((e) => e.payload)).toEqual([{ enquiryId }]);
    // The enquiry message is not also announced as a message.
    expect(await outboxOf('message.created')).toEqual([]);

    await sendText(ctx, buyer, threadId, 'Any update?');
    const reply = await sendText(ctx, owner, threadId, 'Yes, shipping Monday');
    await sendText(ctx, owner, threadId, 'Tracking to follow');

    const replyId = reply.json<{ id: string }>().id;
    expect((await outboxOf('enquiry.replied')).map((e) => e.payload)).toEqual([
      { enquiryId, messageId: replyId },
    ]);
    const messages = await outboxOf('message.created');
    expect(messages).toHaveLength(3);
    // Ids only: no message text reaches the outbox.
    expect(JSON.stringify(messages)).not.toMatch(/shipping|Tracking|Any update/);
  });

  it('records password changes and sign-ins', async () => {
    const user = await registerMobile(ctx);
    await ctx.app.valkey.flushdb(); // the OTP send cooldown from registration
    await sendOtp(ctx.app, user.phone, 'reset');
    const otp = ctx.sms.lastCode(user.phone);
    const reset = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/password/reset',
      payload: { phone: user.phone, otp, newPassword: `${PASSWORD} two` },
      remoteAddress: nextIp(),
    });
    expect(reset.statusCode).toBe(204);
    expect((await outboxOf('security.password_changed')).map((e) => e.payload)).toEqual([
      { userId: user.user.id },
    ]);

    const failed = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { identifier: user.phone, password: PASSWORD },
      remoteAddress: nextIp(),
    });
    expect(failed.statusCode).toBe(401);
    expect(await outboxOf('security.login')).toHaveLength(1); // the sign-in at registration
  });
});

describe('fan-out', () => {
  it('creates the in-app item once, even when the job runs twice', async () => {
    const { business } = await signUpOwner(ctx, refs);
    const fan = await registerMobile(ctx);
    await call(ctx, 'PUT', `/v1/follows/${business.id}`, { as: fan });
    const [event] = await outboxOf('follow.created');
    if (!event) throw new Error('no follow event');

    const fanout = new NotificationFanout(prisma);
    const first = await fanout.process(event.id);
    const again = await fanout.process(event.id);
    expect(again).toEqual(first);
    expect(first).toHaveLength(1);
    expect(await prisma.notification.count({ where: { type: 'follow.new' } })).toBe(1);
  });

  it('honours preferences per category and channel; security ignores them', async () => {
    const { session: owner, business } = await signUpOwner(ctx, refs);
    const buyer = await registerMobile(ctx);
    const productId = await publishedProduct(business.id, refs);
    await prisma.user.update({
      where: { id: owner.user.id },
      data: { email: 'owner@example.test', emailVerifiedAt: new Date() },
    });
    await clearOutbox();

    const enquire = () =>
      postWithKey(ctx, buyer, '/v1/enquiries', {
        productId,
        message: `We need ${randomUUID()} units.`,
      });

    expect((await enquire()).statusCode).toBe(201);
    let [delivery] = await drainOutbox();
    expect(delivery).toMatchObject({ userId: owner.user.id, push: 'now', email: true });

    const put = await call(ctx, 'PUT', '/v1/me/notification-prefs', {
      as: owner,
      body: {
        prefs: [
          { category: 'enquiries', channel: 'push', enabled: false },
          { category: 'enquiries', channel: 'email', enabled: false },
        ],
      },
    });
    expect(put.statusCode).toBe(200);

    // One enquiry per listing per day: clear the limiter between sends.
    await ctx.app.valkey.flushdb();
    expect((await enquire()).statusCode).toBe(201);
    [delivery] = await drainOutbox();
    expect(delivery).toMatchObject({ push: null, email: false });
    // In-app is always on.
    expect(await prisma.notification.count({ where: { userId: owner.user.id } })).toBe(2);

    // Security events go out whatever the preferences say.
    await prisma.notificationPref.create({
      data: { userId: owner.user.id, category: 'account', channel: 'push', enabled: false },
    });
    await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      headers: { 'x-client': 'mobile' },
      payload: { identifier: owner.phone, password: PASSWORD },
      remoteAddress: nextIp(),
    });
    [delivery] = await drainOutbox();
    expect(delivery).toMatchObject({ push: 'now', email: true, isUrgent: true });
  });

  it('emails only a verified address', async () => {
    const user = await registerMobile(ctx);
    await prisma.user.update({
      where: { id: user.user.id },
      data: { email: 'unverified@example.test', emailVerifiedAt: null },
    });
    await prisma.outboxEvent.create({
      data: { type: 'security.password_changed', payload: { userId: user.user.id } },
    });
    const deliveries = await drainOutbox();
    expect(deliveries.at(-1)).toMatchObject({ push: 'now', email: false });
  });

  it('skips the actor themself, blocked pairs and muted threads', async () => {
    const { session: owner, postId } = await ownerWithPost(ctx, refs);
    const fan = await registerMobile(ctx);
    await clearOutbox();

    await like(owner, postId);
    expect(await drainOutbox()).toEqual([]);

    await call(ctx, 'PUT', `/v1/blocks/${fan.user.id}`, { as: owner });
    await like(fan, postId);
    expect(await drainOutbox()).toEqual([]);
    expect(await inboxOf(owner.user.id)).toEqual([]);
  });

  it('keeps a muted thread in-app only', async () => {
    const { owner, buyer, business } = await ownerAndBuyer(ctx, refs);
    const threadId = await openThread(ctx, buyer, business.id);
    await call(ctx, 'PATCH', `/v1/conversations/${threadId}`, {
      as: owner,
      body: { muted: true },
    });
    await clearOutbox();
    await sendText(ctx, buyer, threadId, 'Hello');
    const [delivery] = await drainOutbox();
    expect(delivery).toMatchObject({ userId: owner.user.id, push: null });
    expect(await inboxOf(owner.user.id)).toHaveLength(1);
  });

  it('notifies the post owner of comments and the comment author of replies', async () => {
    const { session: owner, postId } = await ownerWithPost(ctx, refs);
    const [alice, bob] = [await registerMobile(ctx), await registerMobile(ctx)];
    await clearOutbox();
    const comment = (as: MobileSession, body: object) =>
      call(ctx, 'POST', `/v1/posts/${postId}/comments`, { as, body });

    const top = (await comment(alice, { body: 'Price?' })).json<{ id: string }>().id;
    await comment(bob, { body: 'Same question', parentId: top });
    await drainOutbox();

    expect((await inboxOf(alice.user.id)).map((n) => n.type)).toEqual(['comment.replied']);
    const ownerInbox = await inboxOf(owner.user.id);
    expect(ownerInbox.map((n) => [n.type, n.actorCount])).toEqual([['post.commented', 2]]);
  });
});

describe('batching', () => {
  it('collapses likes on a post into one item and one push', async () => {
    const { session: owner, postId } = await ownerWithPost(ctx, refs);
    const [a, b, c] = [
      await registerMobile(ctx),
      await registerMobile(ctx),
      await registerMobile(ctx),
    ];
    await clearOutbox();

    for (const fan of [a, b, c]) await like(fan, postId);
    // Unlike and like again: still the same three people.
    await call(ctx, 'DELETE', `/v1/posts/${postId}/like`, { as: c });
    await like(c, postId);
    const deliveries = await drainOutbox();

    const inbox = await inboxOf(owner.user.id);
    expect(inbox).toHaveLength(1);
    expect(inbox[0]).toMatchObject({
      type: 'post.liked',
      actorCount: 3,
      actorUserId: c.user.id,
      targetId: postId,
    });
    expect(deliveries.map((d) => d.push)).toEqual(['batched', null, null, null]);
  });

  it('starts a new batch after the window, or once the item was read', async () => {
    const { session: owner, postId } = await ownerWithPost(ctx, refs);
    const [a, b, c] = [
      await registerMobile(ctx),
      await registerMobile(ctx),
      await registerMobile(ctx),
    ];
    await clearOutbox();

    await like(a, postId);
    await drainOutbox();
    await like(b, postId);
    await drainOutbox(minutesFromNow(NOTIFICATION_LIMITS.batchWindowSec / 60 + 1));
    expect(await inboxOf(owner.user.id)).toHaveLength(2);

    await call(ctx, 'POST', '/v1/notifications/read', { as: owner, body: { all: true } });
    await like(c, postId);
    await drainOutbox(minutesFromNow(NOTIFICATION_LIMITS.batchWindowSec / 60 + 1));
    expect((await inboxOf(owner.user.id)).map((n) => n.actorCount)).toEqual([1, 1, 1]);
  });

  it('opens one batch under concurrent jobs', async () => {
    const { session: owner, postId } = await ownerWithPost(ctx, refs);
    const fans = await Promise.all(Array.from({ length: 5 }, () => registerMobile(ctx)));
    await clearOutbox();
    for (const fan of fans) await like(fan, postId);

    const fanout = new NotificationFanout(prisma);
    const events = await outboxOf('post.liked');
    const results = await Promise.all(events.map((event) => fanout.process(event.id)));
    expect(results.flat().filter((d) => d.isNew)).toHaveLength(1);
    expect((await inboxOf(owner.user.id))[0]?.actorCount).toBe(5);
  });
});

describe('notifications API', () => {
  let owner: MobileSession;
  let fan: MobileSession;
  let follower: MobileSession;
  let postId: string;
  let businessId: string;

  beforeEach(async () => {
    const created = await ownerWithPost(ctx, refs);
    owner = created.session;
    postId = created.postId;
    businessId = created.business.id;
    fan = await registerMobile(ctx);
    follower = await registerMobile(ctx);
    await clearOutbox();
    await like(fan, postId);
    await call(ctx, 'PUT', `/v1/follows/${businessId}`, { as: follower });
    await drainOutbox();
  });

  const list = (as: MobileSession | undefined, query = '') =>
    call(ctx, 'GET', `/v1/notifications${query}`, as ? { as } : {});

  it('lists the newest first with actor, target and the unread count', async () => {
    const response = await list(owner);
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.unreadCount).toBe(2);
    expect(body.data).toEqual([
      expect.objectContaining({
        type: 'follow.new',
        category: 'business',
        actor: { id: follower.user.id, name: 'Asha Traders' },
        actorCount: 1,
        target: { type: 'business', id: businessId },
        readAt: null,
      }),
      expect.objectContaining({ type: 'post.liked', target: { type: 'post', id: postId } }),
    ]);
    // No phone, email or other private fields.
    expect(JSON.stringify(body)).not.toMatch(/phone|email|\+91/);
  });

  it('pages with a cursor and filters by category', async () => {
    const first = (await list(owner, '?limit=1')).json();
    expect(first.data).toHaveLength(1);
    const second = (await list(owner, `?limit=1&cursor=${first.nextCursor}`)).json();
    expect(second.data[0].type).toBe('post.liked');
    expect(second.nextCursor).toBeNull();

    expect((await list(owner, '?category=messages')).json().data).toEqual([]);
    expect((await list(owner, '?category=nope')).statusCode).toBe(400);
    expect((await list(owner, '?cursor=bad')).statusCode).toBe(400);
  });

  it('marks ids read, then everything', async () => {
    const [newest] = (await list(owner)).json().data;
    const read = await call(ctx, 'POST', '/v1/notifications/read', {
      as: owner,
      body: { ids: [newest.id] },
    });
    expect(read.json()).toEqual({ unreadCount: 1 });
    expect((await list(owner)).json().data[0].readAt).not.toBeNull();

    const all = await call(ctx, 'POST', '/v1/notifications/read', {
      as: owner,
      body: { all: true },
    });
    expect(all.json()).toEqual({ unreadCount: 0 });
  });

  it('keeps every user to their own notifications', async () => {
    const stranger = fan;
    const ownerIds = (await list(owner)).json().data.map((n: { id: string }) => n.id);

    expect((await list(stranger)).json()).toEqual({ data: [], nextCursor: null, unreadCount: 0 });
    // Marking someone else's ids (or everything) leaves theirs alone, and reveals nothing.
    const read = await call(ctx, 'POST', '/v1/notifications/read', {
      as: stranger,
      body: { ids: ownerIds },
    });
    expect(read.json()).toEqual({ unreadCount: 0 });
    await call(ctx, 'POST', '/v1/notifications/read', { as: stranger, body: { all: true } });
    expect((await list(owner)).json().unreadCount).toBe(2);

    // A cursor from another user's list doesn't leak their rows.
    const paged = (
      await list(stranger, `?cursor=${(await list(owner, '?limit=1')).json().nextCursor}`)
    ).json();
    expect(paged.data).toEqual([]);
  });

  it('rejects guests and bad bodies', async () => {
    expect((await list(undefined)).statusCode).toBe(401);
    expect(
      (await call(ctx, 'POST', '/v1/notifications/read', { body: { all: true } })).statusCode,
    ).toBe(401);
    expect((await call(ctx, 'GET', '/v1/me/notification-prefs')).statusCode).toBe(401);
    expect(
      (await call(ctx, 'PUT', '/v1/me/notification-prefs', { body: { prefs: [] } })).statusCode,
    ).toBe(401);

    const bad = [
      {},
      { all: false },
      { ids: [] },
      { ids: ['not-a-uuid'] },
      { ids: Array.from({ length: NOTIFICATION_LIMITS.readIdsMax + 1 }, () => randomUUID()) },
      { ids: [randomUUID()], userId: owner.user.id },
    ];
    for (const body of bad) {
      const response = await call(ctx, 'POST', '/v1/notifications/read', { as: owner, body });
      expect(response.statusCode, JSON.stringify(body).slice(0, 60)).toBe(400);
    }
  });

  it('reads and updates preferences, and refuses to switch off security', async () => {
    const initial = (await call(ctx, 'GET', '/v1/me/notification-prefs', { as: owner })).json();
    expect(initial.prefs).toHaveLength(12);
    expect(initial.prefs.every((p: { enabled: boolean }) => p.enabled)).toBe(true);
    expect(initial.prefs.filter((p: { isLocked: boolean }) => p.isLocked)).toEqual([
      { category: 'account', channel: 'push', enabled: true, isLocked: true },
      { category: 'account', channel: 'email', enabled: true, isLocked: true },
    ]);

    const updated = await call(ctx, 'PUT', '/v1/me/notification-prefs', {
      as: owner,
      body: { prefs: [{ category: 'business', channel: 'push', enabled: false }] },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().prefs).toContainEqual({
      category: 'business',
      channel: 'push',
      enabled: false,
      isLocked: false,
    });
    // Someone else's preferences are untouched.
    const theirs = (await call(ctx, 'GET', '/v1/me/notification-prefs', { as: fan })).json();
    expect(theirs.prefs.every((p: { enabled: boolean }) => p.enabled)).toBe(true);

    const locked = await call(ctx, 'PUT', '/v1/me/notification-prefs', {
      as: owner,
      body: { prefs: [{ category: 'account', channel: 'email', enabled: false }] },
    });
    expect(locked.statusCode).toBe(400);
  });
});
