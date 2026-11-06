import { randomUUID } from 'node:crypto';
import { RATE_LIMITS } from '@supporters/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type ReferenceData, call, referenceData } from '../../test/catalog';
import { openThread, publishedProduct, sendText } from '../../test/chat';
import {
  type MobileSession,
  type TestContext,
  createTestApp,
  prisma,
  problemCode,
  registerMobile,
  resetState,
} from '../../test/helpers';
import { clearOutbox, drainOutbox, inboxOf, outboxOf } from '../../test/notifications';
import { ownerWithPost, pageIds } from '../../test/social';

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

let owner: MobileSession;
let business: { id: string; slug: string };
let postId: string;

beforeEach(async () => {
  ({ session: owner, business, postId } = await ownerWithPost(ctx, refs));
});

const report = (as: MobileSession | undefined, body: object) =>
  call(ctx, 'POST', '/v1/reports', { ...(as ? { as } : {}), body });

const reportOf = (targetType: string, targetId: string, reason = 'spam') => ({
  targetType,
  targetId,
  reason,
});

/** Signs up `count` different users. */
const users = (count: number) =>
  Promise.all(Array.from({ length: count }, () => registerMobile(ctx)));

describe('POST /v1/reports', () => {
  it('rejects guests and bad bodies', async () => {
    expect((await report(undefined, reportOf('post', postId))).statusCode).toBe(401);
    const [user] = await users(1);
    const bad = [
      { targetType: 'user', targetId: postId, reason: 'spam' },
      { targetType: 'post', targetId: 'nope', reason: 'spam' },
      { targetType: 'post', targetId: postId, reason: 'rude' },
      { ...reportOf('post', postId), details: 'x'.repeat(501) },
      { ...reportOf('post', postId), extra: true },
    ];
    for (const body of bad) {
      expect((await report(user, body)).statusCode, JSON.stringify(body)).toBe(400);
    }
  });

  it('files a report once per person and target', async () => {
    const [user] = await users(1);
    const first = await report(user, { ...reportOf('post', postId, 'fraud'), details: ' Fake ' });
    expect(first.statusCode).toBe(201);
    const again = await report(user, reportOf('post', postId, 'other'));
    expect(again.statusCode).toBe(200);
    expect(again.json().id).toBe(first.json().id);

    const rows = await prisma.report.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      reporterUserId: user?.user.id,
      targetType: 'post',
      targetId: postId,
      subjectUserId: owner.user.id,
      reason: 'fraud',
      details: 'Fake',
      status: 'open',
    });
  });

  it('answers 404 for unknown, hidden or not-yet-reportable targets, and 400 for your own', async () => {
    const [user] = await users(1);
    expect((await report(user, reportOf('post', randomUUID()))).statusCode).toBe(404);
    expect((await report(user, reportOf('review', randomUUID()))).statusCode).toBe(404);
    expect((await report(user, reportOf('requirement', randomUUID()))).statusCode).toBe(404);
    // A business id is not a post id.
    expect((await report(user, reportOf('post', business.id))).statusCode).toBe(404);

    const own = await report(owner, reportOf('post', postId));
    expect(own.statusCode).toBe(400);
    expect(own.json().errors[0].path).toBe('body.targetId');

    await prisma.post.update({ where: { id: postId }, data: { hiddenAt: new Date() } });
    expect((await report(user, reportOf('post', postId))).statusCode).toBe(404);
  });

  it('reports comments and businesses', async () => {
    const author = await registerMobile(ctx);
    const reporter = await registerMobile(ctx);
    const comment = await call(ctx, 'POST', `/v1/posts/${postId}/comments`, {
      as: author,
      body: { body: 'Buy cheap followers at example.com' },
    });
    const commentId = comment.json<{ id: string }>().id;
    expect((await report(reporter, reportOf('comment', commentId))).statusCode).toBe(201);
    expect(
      (await report(reporter, reportOf('business', business.id, 'wrong_category'))).statusCode,
    ).toBe(201);
    const subjects = await prisma.report.findMany({
      select: { targetType: true, subjectUserId: true },
    });
    expect(subjects).toEqual(
      expect.arrayContaining([
        { targetType: 'comment', subjectUserId: author.user.id },
        { targetType: 'business', subjectUserId: owner.user.id },
      ]),
    );
  });

  it('lets only the two ends of a thread report its messages', async () => {
    const [buyer, stranger] = await users(2);
    if (!buyer || !stranger) throw new Error('setup');
    await publishedProduct(business.id, refs);
    const threadId = await openThread(ctx, buyer, business.id);
    const sent = await sendText(ctx, owner, threadId, 'Pay the advance to my personal UPI');
    const messageId = sent.json<{ id: string }>().id;

    expect((await report(stranger, reportOf('message', messageId, 'fraud'))).statusCode).toBe(404);
    expect((await report(owner, reportOf('message', messageId))).statusCode).toBe(400);
    expect((await report(buyer, reportOf('message', messageId, 'fraud'))).statusCode).toBe(201);
  });

  it(`allows ${RATE_LIMITS.reportsPerDay} new reports a day`, async () => {
    const [user] = await users(1);
    for (let i = 0; i < RATE_LIMITS.reportsPerDay; i += 1) {
      await prisma.report.deleteMany();
      expect((await report(user, reportOf('post', postId))).statusCode).toBe(201);
    }
    await prisma.report.deleteMany();
    const limited = await report(user, reportOf('post', postId));
    expect(limited.statusCode).toBe(429);
    expect(problemCode(limited)).toBe('RATE_LIMITED');
  });
});

describe('auto-hide after 5 distinct reporters', () => {
  it('hides a post at the fifth open report, tells the author once, and drops it from reads', async () => {
    await clearOutbox();
    const reporters = await users(6);
    for (const reporter of reporters.slice(0, 4)) {
      expect((await report(reporter, reportOf('post', postId))).statusCode).toBe(201);
    }
    // Four reports, and a repeat from one of them, change nothing.
    await report(reporters[0], reportOf('post', postId));
    expect((await call(ctx, 'GET', `/v1/posts/${postId}`)).statusCode).toBe(200);

    expect((await report(reporters[4], reportOf('post', postId))).statusCode).toBe(201);
    expect((await call(ctx, 'GET', `/v1/posts/${postId}`)).statusCode).toBe(404);
    expect(pageIds(await call(ctx, 'GET', `/v1/businesses/${business.id}/posts`))).toEqual([]);
    expect(pageIds(await call(ctx, 'GET', '/v1/feed'))).toEqual([]);
    expect((await call(ctx, 'GET', `/v1/posts/${postId}/comments`)).statusCode).toBe(404);
    // Hidden content can no longer be reported.
    expect((await report(reporters[5], reportOf('post', postId))).statusCode).toBe(404);

    const events = await outboxOf('content.hidden');
    expect(events.map((event) => event.payload)).toEqual([
      { userId: owner.user.id, targetType: 'post', targetId: postId },
    ]);
    await drainOutbox();
    const [notice] = await inboxOf(owner.user.id);
    expect(notice).toMatchObject({
      type: 'content.hidden',
      category: 'account',
      actorUserId: null,
      targetType: 'account',
      targetId: null,
    });
  });

  it('counts only open reports', async () => {
    const reporters = await users(5);
    for (const reporter of reporters.slice(0, 4)) await report(reporter, reportOf('post', postId));
    await prisma.report.updateMany({ data: { status: 'dismissed' } });
    await report(reporters[4], reportOf('post', postId));
    expect((await call(ctx, 'GET', `/v1/posts/${postId}`)).statusCode).toBe(200);
  });

  it('hides exactly once when the reports arrive together', async () => {
    const reporters = await users(8);
    const responses = await Promise.all(
      reporters.map((reporter) => report(reporter, reportOf('post', postId))),
    );
    // Reports racing past the hide answer 404; the first five always land.
    expect(
      responses.filter((response) => response.statusCode === 201).length,
    ).toBeGreaterThanOrEqual(5);
    expect(await outboxOf('content.hidden')).toHaveLength(1);
    expect(
      (await prisma.post.findUniqueOrThrow({ where: { id: postId } })).hiddenAt,
    ).not.toBeNull();
  });

  it('hides comments too, but never a business page or a message on count alone', async () => {
    const author = await registerMobile(ctx);
    const reporters = await users(5);
    const comment = await call(ctx, 'POST', `/v1/posts/${postId}/comments`, {
      as: author,
      body: { body: 'Spam spam spam' },
    });
    const commentId = comment.json<{ id: string }>().id;
    for (const reporter of reporters) {
      await report(reporter, reportOf('comment', commentId));
      await report(reporter, reportOf('business', business.id));
    }
    const comments = await call(ctx, 'GET', `/v1/posts/${postId}/comments`);
    expect(pageIds(comments)).toEqual([]);
    expect((await call(ctx, 'GET', `/v1/businesses/${business.slug}`)).statusCode).toBe(200);
    expect((await outboxOf('content.hidden')).map((event) => event.payload)).toEqual([
      { userId: author.user.id, targetType: 'comment', targetId: commentId },
    ]);
  });
});

describe('hidden content', () => {
  it('takes a hidden business out of every public read', async () => {
    const productId = await publishedProduct(business.id, refs);
    const viewer = await registerMobile(ctx);
    await prisma.business.update({ where: { id: business.id }, data: { hiddenAt: new Date() } });

    expect((await call(ctx, 'GET', `/v1/businesses/${business.slug}`)).statusCode).toBe(404);
    expect((await call(ctx, 'GET', `/v1/posts/${postId}`)).statusCode).toBe(404);
    expect((await call(ctx, 'GET', `/v1/products/${productId}`)).statusCode).toBe(404);
    expect(pageIds(await call(ctx, 'GET', '/v1/feed', { as: viewer }))).toEqual([]);
    expect(
      (
        await call(ctx, 'POST', '/v1/conversations', {
          as: viewer,
          body: { businessId: business.id },
        })
      ).statusCode,
    ).toBe(404);
    // The owner still manages it.
    expect((await call(ctx, 'GET', '/v1/me/business', { as: owner })).statusCode).toBe(200);
  });

  it('takes a hidden message out of the thread for both sides', async () => {
    const [buyer] = await users(1);
    if (!buyer) throw new Error('setup');
    const threadId = await openThread(ctx, buyer, business.id);
    const first = (await sendText(ctx, buyer, threadId, 'Hello')).json<{ id: string }>().id;
    const second = (await sendText(ctx, buyer, threadId, 'Scam link')).json<{ id: string }>().id;
    await prisma.message.update({ where: { id: second }, data: { hiddenAt: new Date() } });

    for (const as of [buyer, owner]) {
      const messages = await call(ctx, 'GET', `/v1/conversations/${threadId}/messages`, { as });
      expect(pageIds(messages)).toEqual([first]);
      const inbox = await call(ctx, 'GET', '/v1/conversations', { as });
      expect(inbox.json().data[0].lastMessage.id).toBe(first);
    }
  });
});
