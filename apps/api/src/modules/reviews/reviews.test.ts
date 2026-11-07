import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type ReferenceData, call, referenceData, signUpOwner } from '../../test/catalog';
import { openThread, postWithKey, publishedProduct, sendText } from '../../test/chat';
import {
  type MobileSession,
  type TestContext,
  createTestApp,
  prisma,
  problemCode,
  registerMobile,
  resetState,
} from '../../test/helpers';
import { clearOutbox, drainOutbox, inboxOf } from '../../test/notifications';
import { recomputeRating } from './reviews.service';

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

const HOUR_MS = 60 * 60 * 1000;
const BODY = 'Delivered on time and the bolts were exactly to spec.';

let owner: MobileSession;
let businessId: string;
let slug: string;

beforeEach(async () => {
  const signedUp = await signUpOwner(ctx, refs);
  owner = signedUp.session;
  businessId = signedUp.business.id;
  slug = signedUp.business.slug;
});

/** A user whose thread with the business holds a message and is `ageHours` old. */
async function buyerWithThread(ageHours = 25) {
  const buyer = await registerMobile(ctx);
  const threadId = await openThread(ctx, buyer, businessId);
  await sendText(ctx, buyer, threadId, 'Do you ship to Pune?');
  await prisma.conversation.update({
    where: { id: threadId },
    data: { createdAt: new Date(Date.now() - ageHours * HOUR_MS) },
  });
  return buyer;
}

const review = (as: MobileSession, body: object = {}) =>
  call(ctx, 'POST', `/v1/businesses/${businessId}/reviews`, {
    as,
    body: { rating: 4, body: BODY, ...body },
  });
const rating = async () =>
  (await call(ctx, 'GET', `/v1/businesses/${slug}`)).json<{
    rating: { average: number | null; count: number };
  }>().rating;

describe('eligibility', () => {
  it('needs a chat or enquiry thread at least 24 hours old', async () => {
    const stranger = await registerMobile(ctx);
    const noThread = await review(stranger);
    expect(noThread.statusCode).toBe(403);
    expect(problemCode(noThread)).toBe('REVIEW_NOT_ELIGIBLE');
    const mine = await call(ctx, 'GET', `/v1/businesses/${businessId}/reviews/mine`, {
      as: stranger,
    });
    expect(mine.json()).toEqual({ review: null, eligibility: 'no_thread', eligibleAt: null });

    const fresh = await buyerWithThread(2);
    expect((await review(fresh)).statusCode).toBe(403);
    const soon = await call(ctx, 'GET', `/v1/businesses/${businessId}/reviews/mine`, {
      as: fresh,
    });
    expect(soon.json()).toMatchObject({ eligibility: 'too_soon' });
    const eligibleIn = Date.parse(soon.json().eligibleAt) - Date.now();
    expect(eligibleIn).toBeGreaterThan(21 * HOUR_MS);
    expect(eligibleIn).toBeLessThan(23 * HOUR_MS);

    const old = await buyerWithThread(25);
    const okMine = await call(ctx, 'GET', `/v1/businesses/${businessId}/reviews/mine`, {
      as: old,
    });
    expect(okMine.json()).toMatchObject({ eligibility: 'eligible' });
    expect((await review(old)).statusCode).toBe(201);
  });

  it('does not count an empty thread', async () => {
    const buyer = await registerMobile(ctx);
    const threadId = await openThread(ctx, buyer, businessId);
    await prisma.conversation.update({
      where: { id: threadId },
      data: { createdAt: new Date(Date.now() - 48 * HOUR_MS) },
    });
    expect((await review(buyer)).statusCode).toBe(403);
  });

  it('counts an enquiry thread', async () => {
    const buyer = await registerMobile(ctx);
    const productId = await publishedProduct(businessId, refs);
    await postWithKey(ctx, buyer, '/v1/enquiries', {
      productId,
      message: 'We need 500 units delivered next month.',
    });
    await prisma.conversation.updateMany({
      data: { createdAt: new Date(Date.now() - 25 * HOUR_MS) },
    });
    expect((await review(buyer)).statusCode).toBe(201);
  });

  it('allows one review per user and never by the owner', async () => {
    const buyer = await buyerWithThread();
    expect((await review(buyer)).statusCode).toBe(201);
    const again = await review(buyer, { rating: 1 });
    expect(again.statusCode).toBe(409);
    expect(problemCode(again)).toBe('REVIEW_EXISTS');
    const mine = await call(ctx, 'GET', `/v1/businesses/${businessId}/reviews/mine`, {
      as: buyer,
    });
    expect(mine.json()).toMatchObject({ eligibility: 'reviewed', review: { rating: 4 } });

    const own = await review(owner);
    expect(own.statusCode).toBe(403);
    expect(problemCode(own)).toBe('FORBIDDEN');
  });

  it('refuses a blocked pair and a suspended author', async () => {
    const blocked = await buyerWithThread();
    await call(ctx, 'PUT', `/v1/blocks/${blocked.user.id}`, { as: owner });
    const response = await review(blocked);
    expect(response.statusCode).toBe(403);
    expect(problemCode(response)).toBe('BLOCKED');

    const suspended = await buyerWithThread();
    await prisma.user.update({ where: { id: suspended.user.id }, data: { status: 'suspended' } });
    expect(problemCode(await review(suspended))).toBe('ACCOUNT_SUSPENDED');
  });

  it('validates the review', async () => {
    const buyer = await buyerWithThread();
    for (const body of [
      { rating: 0 },
      { rating: 6 },
      { rating: 4.5 },
      { body: 'Too short.' },
      { body: 'x'.repeat(1_001) },
      { ownerReply: 'sneaky' },
    ]) {
      expect((await review(buyer, body)).statusCode, JSON.stringify(body)).toBe(400);
    }
    expect(
      (
        await call(ctx, 'POST', `/v1/businesses/${randomUUID()}/reviews`, {
          as: buyer,
          body: { rating: 4, body: BODY },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await call(ctx, 'POST', `/v1/businesses/${businessId}/reviews`, {
          body: { rating: 4, body: BODY },
        })
      ).statusCode,
    ).toBe(401);
  });
});

describe('authorization', () => {
  let author: MobileSession;
  let stranger: MobileSession;
  let reviewId: string;

  beforeEach(async () => {
    author = await buyerWithThread();
    stranger = await registerMobile(ctx);
    reviewId = (await review(author)).json().id;
  });

  it('lets only the author edit or delete', async () => {
    for (const as of [owner, stranger]) {
      const edit = await call(ctx, 'PATCH', `/v1/reviews/${reviewId}`, {
        as,
        body: { rating: 1 },
      });
      expect(edit.statusCode).toBe(404);
      expect((await call(ctx, 'DELETE', `/v1/reviews/${reviewId}`, { as })).statusCode).toBe(404);
    }
    expect(
      (await call(ctx, 'PATCH', `/v1/reviews/${reviewId}`, { body: { rating: 1 } })).statusCode,
    ).toBe(401);
    const empty = await call(ctx, 'PATCH', `/v1/reviews/${reviewId}`, { as: author, body: {} });
    expect(empty.statusCode).toBe(400);

    const edited = await call(ctx, 'PATCH', `/v1/reviews/${reviewId}`, {
      as: author,
      body: { body: 'Second order was even faster than the first.' },
    });
    expect(edited.json()).toMatchObject({ rating: 4, isMine: true });
    expect(Date.parse(edited.json().updatedAt)).toBeGreaterThan(
      Date.parse(edited.json().createdAt),
    );
    const removed = await call(ctx, 'DELETE', `/v1/reviews/${reviewId}`, { as: author });
    expect(removed.statusCode).toBe(204);
    expect(await prisma.review.count()).toBe(0);
  });

  it('lets only the owner reply, once, editable and removable', async () => {
    for (const as of [author, stranger]) {
      const response = await call(ctx, 'PUT', `/v1/reviews/${reviewId}/reply`, {
        as,
        body: { body: 'Thank you!' },
      });
      expect(response.statusCode).toBe(404);
    }
    const first = await call(ctx, 'PUT', `/v1/reviews/${reviewId}/reply`, {
      as: owner,
      body: { body: 'Thank you!' },
    });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toMatchObject({ ownerReply: { body: 'Thank you!' }, isMine: false });
    // A reply is not an edit by the author.
    expect(first.json().updatedAt).toBe(first.json().createdAt);
    const second = await call(ctx, 'PUT', `/v1/reviews/${reviewId}/reply`, {
      as: owner,
      body: { body: 'Thank you, see you again.' },
    });
    expect(second.json().ownerReply.body).toBe('Thank you, see you again.');
    expect(
      (await call(ctx, 'PUT', `/v1/reviews/${reviewId}/reply`, { as: owner, body: { body: '' } }))
        .statusCode,
    ).toBe(400);
    expect(
      (await call(ctx, 'DELETE', `/v1/reviews/${reviewId}/reply`, { as: author })).statusCode,
    ).toBe(404);
    expect(
      (await call(ctx, 'DELETE', `/v1/reviews/${reviewId}/reply`, { as: owner })).statusCode,
    ).toBe(204);
    const list = await call(ctx, 'GET', `/v1/businesses/${businessId}/reviews`);
    expect(list.json().data[0].ownerReply).toBeNull();
  });

  it('lists reviews publicly, newest first, and hides hidden ones', async () => {
    const second = await buyerWithThread();
    const secondId = (await review(second, { rating: 2 })).json().id;
    const guest = await call(ctx, 'GET', `/v1/businesses/${businessId}/reviews?limit=1`);
    expect(guest.statusCode).toBe(200);
    expect(guest.json()).toMatchObject({
      data: [{ id: secondId, isMine: false, author: { id: second.user.id } }],
      rating: { count: 2, average: null },
    });
    expect(JSON.stringify(guest.json())).not.toContain(second.phone);
    const page2 = await call(
      ctx,
      'GET',
      `/v1/businesses/${businessId}/reviews?limit=1&cursor=${guest.json().nextCursor}`,
      { as: author },
    );
    expect(page2.json()).toMatchObject({
      data: [{ id: reviewId, isMine: true }],
      nextCursor: null,
    });

    await prisma.review.update({ where: { id: secondId }, data: { hiddenAt: new Date() } });
    const after = await call(ctx, 'GET', `/v1/businesses/${businessId}/reviews`);
    expect(after.json().data.map((r: { id: string }) => r.id)).toEqual([reviewId]);
    // The owner cannot reply to a hidden review.
    const reply = await call(ctx, 'PUT', `/v1/reviews/${secondId}/reply`, {
      as: owner,
      body: { body: 'Hello' },
    });
    expect(reply.statusCode).toBe(404);
  });
});

describe('rating', () => {
  it('shows "New" below 3 reviews, then the average to one decimal', async () => {
    expect(await rating()).toEqual({ average: null, count: 0 });
    const ids: string[] = [];
    for (const stars of [5, 4]) {
      ids.push((await review(await buyerWithThread(), { rating: stars })).json().id);
    }
    expect(await rating()).toEqual({ average: null, count: 2 });
    const third = await buyerWithThread();
    const thirdId = (await review(third, { rating: 4 })).json().id;
    expect(await rating()).toEqual({ average: 4.3, count: 3 });

    await call(ctx, 'PATCH', `/v1/reviews/${thirdId}`, { as: third, body: { rating: 1 } });
    expect(await rating()).toEqual({ average: 3.3, count: 3 });

    await call(ctx, 'DELETE', `/v1/reviews/${thirdId}`, { as: third });
    expect(await rating()).toEqual({ average: null, count: 2 });
    const stored = await prisma.business.findUniqueOrThrow({ where: { id: businessId } });
    expect(stored.ratingAvg?.toNumber()).toBe(4.5);
  });

  it('drops hidden reviews from the average when moderation recomputes', async () => {
    const ids: string[] = [];
    for (const stars of [5, 5, 5, 1]) {
      ids.push((await review(await buyerWithThread(), { rating: stars })).json().id);
    }
    expect(await rating()).toEqual({ average: 4, count: 4 });
    await prisma.$transaction(async (tx) => {
      await tx.review.update({ where: { id: ids[3] ?? '' }, data: { hiddenAt: new Date() } });
      await recomputeRating(tx, businessId);
    });
    expect(await rating()).toEqual({ average: 5, count: 3 });
  });

  it('counts concurrent reviews correctly', async () => {
    const buyers = await Promise.all(Array.from({ length: 6 }, () => buyerWithThread()));
    const responses = await Promise.all(
      buyers.map((buyer, i) => review(buyer, { rating: (i % 5) + 1 })),
    );
    expect(responses.map((r) => r.statusCode)).toEqual(Array(6).fill(201));
    // 1+2+3+4+5+1 = 16 / 6 = 2.67
    expect(await rating()).toEqual({ average: 2.7, count: 6 });
  });
});

describe('notifications', () => {
  it('tells the owner, batched per business', async () => {
    const first = await buyerWithThread();
    const second = await buyerWithThread();
    await clearOutbox();
    await review(first);
    await review(second);
    await drainOutbox();
    const inbox = (await inboxOf(owner.user.id)).filter((n) => n.type === 'review.new');
    expect(inbox).toMatchObject([
      { actorUserId: second.user.id, actorCount: 2, targetType: 'business', targetId: businessId },
    ]);
  });
});
