import { randomUUID } from 'node:crypto';
import { ENQUIRY_LIMITS, RATE_LIMITS } from '@supporters/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
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
  type TestContext,
  createTestApp,
  prisma,
  problemCode,
  registerMobile,
  resetState,
} from '../../test/helpers';

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
let buyer: MobileSession;
let businessId: string;
let productId: string;

beforeEach(async () => {
  ({
    owner,
    buyer,
    productId,
    business: { id: businessId },
  } = await ownerAndBuyer(ctx, refs));
});

const MESSAGE = 'We need 500 units delivered to Pune next month.';
const enquire = (as: MobileSession, body: object = {}, key: string = randomUUID()) =>
  postWithKey(ctx, as, '/v1/enquiries', { productId, message: MESSAGE, ...body }, key);
const ownerInbox = (as: MobileSession = owner, query = '') =>
  call(ctx, 'GET', `/v1/me/business/enquiries${query}`, { as });

describe('POST /v1/enquiries', () => {
  it('rejects guests', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/v1/enquiries',
      headers: { 'idempotency-key': randomUUID() },
      payload: { productId, message: MESSAGE },
    });
    expect(response.statusCode).toBe(401);
  });

  it('validates the form', async () => {
    const bad: object[] = [
      { message: 'too short' },
      { message: 'x'.repeat(1_001) },
      { productId: undefined },
      { serviceId: randomUUID() },
      { quantity: 0 },
      { unit: 'parsec' },
      { businessId },
      { status: 'responded' },
    ];
    for (const body of bad) {
      expect((await enquire(buyer, body)).statusCode, JSON.stringify(body)).toBe(400);
    }
    const noKey = await ctx.app.inject({
      method: 'POST',
      url: '/v1/enquiries',
      headers: { authorization: `Bearer ${buyer.accessToken}` },
      payload: { productId, message: MESSAGE },
    });
    expect(noKey.statusCode).toBe(400);
  });

  it('starts the thread when there is none, and shows as an enquiry card', async () => {
    expect(await prisma.conversation.count()).toBe(0);
    const response = await enquire(buyer, { quantity: 500, unit: 'piece' });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      status: 'new',
      quantity: 500,
      unit: 'piece',
      message: MESSAGE,
      buyer: { id: buyer.user.id },
      business: { id: businessId },
      listing: { type: 'product', id: productId },
      buyerPhone: null,
    });

    const conversation = await prisma.conversation.findFirstOrThrow();
    expect(conversation).toMatchObject({ userId: buyer.user.id, businessId });
    const thread = await call(ctx, 'GET', `/v1/conversations/${conversation.id}/messages`, {
      as: owner,
    });
    expect(thread.json().data).toHaveLength(1);
    expect(thread.json().data[0]).toMatchObject({
      type: 'enquiry',
      body: MESSAGE,
      senderSide: 'user',
      enquiry: { id: response.json().id, status: 'new', quantity: 500 },
      listing: { id: productId },
    });
    expect(response.json().conversationId).toBe(conversation.id);
  });

  it('posts into the existing thread instead of starting another', async () => {
    const threadId = await openThread(ctx, buyer, businessId);
    await sendText(ctx, buyer, threadId, 'Hi, quick question first');
    const other = await publishedProduct(businessId, refs, 'Nuts');
    const response = await enquire(buyer, { productId: other });
    expect(response.statusCode).toBe(201);
    expect(response.json().conversationId).toBe(threadId);
    expect(await prisma.conversation.count()).toBe(1);
    const thread = await call(ctx, 'GET', `/v1/conversations/${threadId}/messages`, { as: buyer });
    expect(thread.json().data.map((m: { type: string }) => m.type)).toEqual(['enquiry', 'text']);
  });

  it('moves the thread to the top of the inbox of the owner and unhides it', async () => {
    const threadId = await openThread(ctx, buyer, businessId);
    await call(ctx, 'PATCH', `/v1/conversations/${threadId}`, {
      as: owner,
      body: { hidden: true },
    });
    await enquire(buyer);
    const inbox = await call(ctx, 'GET', '/v1/conversations', { as: owner });
    expect(inbox.json().data[0]).toMatchObject({ id: threadId, unreadCount: 1, hidden: false });
  });

  it('names a service as well as a product', async () => {
    const service = await prisma.service.create({
      data: {
        businessId,
        categoryId: refs.otherCategory.id,
        title: 'CNC machining',
        description: 'x',
        status: 'published',
      },
    });
    const response = await enquire(buyer, { productId: undefined, serviceId: service.id });
    expect(response.statusCode).toBe(201);
    expect(response.json().listing).toMatchObject({ type: 'service', id: service.id });
  });

  it('refuses your own business, drafts, archived listings and suspended owners', async () => {
    expect((await enquire(owner)).statusCode).toBe(400);
    const draft = await prisma.product.create({
      data: { businessId, categoryId: refs.category.id, title: 'Draft', description: 'x' },
    });
    expect((await enquire(buyer, { productId: draft.id })).statusCode).toBe(404);
    expect((await enquire(buyer, { productId: randomUUID() })).statusCode).toBe(404);
    await prisma.product.update({ where: { id: productId }, data: { status: 'archived' } });
    expect((await enquire(buyer)).statusCode).toBe(404);
    await prisma.product.update({ where: { id: productId }, data: { status: 'published' } });
    await prisma.user.update({ where: { id: owner.user.id }, data: { status: 'suspended' } });
    expect((await enquire(buyer)).statusCode).toBe(404);
    expect(await prisma.enquiry.count()).toBe(0);
  });

  it('refuses an unknown delivery city', async () => {
    const response = await enquire(buyer, { deliveryCityId: randomUUID() });
    expect(response.statusCode).toBe(400);
    const ok = await enquire(buyer, { deliveryCityId: refs.pune.id });
    expect(ok.json().deliveryCity).toMatchObject({ id: refs.pune.id, name: 'Pune' });
  });

  it('refuses when either side has blocked the other', async () => {
    await call(ctx, 'PUT', `/v1/blocks/${owner.user.id}`, { as: buyer });
    const blockedByBuyer = await enquire(buyer);
    expect(blockedByBuyer.statusCode).toBe(403);
    expect(problemCode(blockedByBuyer)).toBe('BLOCKED');
    await call(ctx, 'DELETE', `/v1/blocks/${owner.user.id}`, { as: buyer });
    await call(ctx, 'PUT', `/v1/blocks/${buyer.user.id}`, { as: owner });
    expect((await enquire(buyer)).statusCode).toBe(403);
    expect(await prisma.enquiry.count()).toBe(0);
  });

  it('shares the phone number only when the buyer ticks the box, and only with the business', async () => {
    const hidden = await enquire(buyer);
    const hiddenForOwner = (await ownerInbox()).json().data[0];
    expect(hidden.json().sharePhone).toBe(false);
    expect(hiddenForOwner.buyerPhone).toBeNull();

    const other = await publishedProduct(businessId, refs, 'Nuts');
    const shared = await enquire(buyer, { productId: other, sharePhone: true });
    // The buyer never gets the phone number back, in the response or the list.
    expect(shared.json().buyerPhone).toBeNull();
    expect(
      (await call(ctx, 'GET', '/v1/me/enquiries', { as: buyer })).json().data[0].buyerPhone,
    ).toBeNull();
    const forOwner = (await ownerInbox())
      .json()
      .data.find((e: { sharePhone: boolean }) => e.sharePhone);
    expect(forOwner.buyerPhone).toBe(buyer.phone);
  });
});

describe('limits and idempotency', () => {
  it('allows one enquiry per listing per 24 hours', async () => {
    expect((await enquire(buyer)).statusCode).toBe(201);
    const again = await enquire(buyer);
    expect(again.statusCode).toBe(429);
    expect(problemCode(again)).toBe('RATE_LIMITED');
    expect(Number(again.headers['retry-after'])).toBeGreaterThan(60 * 60 * 20);
    const other = await publishedProduct(businessId, refs, 'Nuts');
    expect((await enquire(buyer, { productId: other })).statusCode).toBe(201);
    // Another buyer is not held back by this one.
    const second = await registerMobile(ctx);
    expect((await enquire(second)).statusCode).toBe(201);
  });

  it('allows 20 enquiries a day per user', async () => {
    const ids = await Promise.all(
      Array.from({ length: RATE_LIMITS.enquiriesPerDay + 1 }, (_, i) =>
        publishedProduct(businessId, refs, `Item ${i}`),
      ),
    );
    for (const id of ids.slice(0, RATE_LIMITS.enquiriesPerDay)) {
      expect((await enquire(buyer, { productId: id })).statusCode).toBe(201);
    }
    const over = await enquire(buyer, { productId: ids.at(-1) });
    expect(over.statusCode).toBe(429);
    expect(await prisma.enquiry.count()).toBe(RATE_LIMITS.enquiriesPerDay);
  }, 120_000);

  it('does not spend quota on a request that fails validation or finds nothing', async () => {
    await enquire(buyer, { message: 'short' });
    await enquire(buyer, { productId: randomUUID() });
    expect((await enquire(buyer)).statusCode).toBe(201);
  });

  it('stores a retry once, replays it for free, and refuses a reused key', async () => {
    const key = randomUUID();
    const first = await enquire(buyer, {}, key);
    // The per-listing limit is used up, yet a retry of the same send still answers.
    const retry = await enquire(buyer, {}, key);
    expect(first.statusCode).toBe(201);
    expect(retry.statusCode).toBe(200);
    expect(retry.json()).toEqual(first.json());
    expect(await prisma.enquiry.count()).toBe(1);
    expect(await prisma.message.count()).toBe(1);

    const reused = await enquire(buyer, { message: 'A completely different request body.' }, key);
    expect(reused.statusCode).toBe(422);
    expect(problemCode(reused)).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('stores concurrent retries once', async () => {
    const key = randomUUID();
    const results = await Promise.all(Array.from({ length: 5 }, () => enquire(buyer, {}, key)));
    expect(results.every((r) => r.statusCode === 200 || r.statusCode === 201)).toBe(true);
    expect(new Set(results.map((r) => r.json().id)).size).toBe(1);
    expect(await prisma.enquiry.count()).toBe(1);
  });

  it('refuses a key that already sent an ordinary message', async () => {
    const threadId = await openThread(ctx, buyer, businessId);
    const key = randomUUID();
    await sendText(ctx, buyer, threadId, 'plain text', key);
    const response = await enquire(buyer, {}, key);
    expect(response.statusCode).toBe(422);
  });
});

describe('enquiry lists', () => {
  it("shows the buyer their own enquiries, newest first, and nobody else's", async () => {
    const other = await publishedProduct(businessId, refs, 'Nuts');
    const first = (await enquire(buyer)).json();
    const second = (await enquire(buyer, { productId: other })).json();
    const stranger = await registerMobile(ctx);
    const mine = await call(ctx, 'GET', '/v1/me/enquiries', { as: buyer });
    expect(mine.json().data.map((e: { id: string }) => e.id)).toEqual([second.id, first.id]);
    expect((await call(ctx, 'GET', '/v1/me/enquiries', { as: stranger })).json().data).toEqual([]);
    expect((await call(ctx, 'GET', '/v1/me/enquiries')).statusCode).toBe(401);
  });

  it('shows the owner only the enquiries of their business', async () => {
    await enquire(buyer);
    const { session: rival } = await signUpOwner(ctx, refs);
    expect((await ownerInbox(rival)).json().data).toEqual([]);
    expect((await ownerInbox()).json().data).toHaveLength(1);
  });

  it('answers 403 BUSINESS_REQUIRED to users without a business, and 401 to guests', async () => {
    const response = await ownerInbox(buyer);
    expect(response.statusCode).toBe(403);
    expect(problemCode(response)).toBe('BUSINESS_REQUIRED');
    expect((await call(ctx, 'GET', '/v1/me/business/enquiries')).statusCode).toBe(401);
  });

  it('filters by status, listing and date, and pages', async () => {
    const other = await publishedProduct(businessId, refs, 'Nuts');
    const a = (await enquire(buyer)).json();
    const b = (await enquire(buyer, { productId: other })).json();
    await call(ctx, 'PATCH', `/v1/me/business/enquiries/${a.id}`, {
      as: owner,
      body: { status: 'closed' },
    });
    const ids = async (query: string) =>
      (await ownerInbox(owner, query)).json().data.map((e: { id: string }) => e.id);
    expect(await ids('?status=closed')).toEqual([a.id]);
    expect(await ids('?status=new')).toEqual([b.id]);
    expect(await ids(`?productId=${other}`)).toEqual([b.id]);
    expect(await ids(`?from=${new Date(Date.now() + 60_000).toISOString()}`)).toEqual([]);
    expect(await ids(`?to=${new Date(Date.now() + 60_000).toISOString()}`)).toEqual([b.id, a.id]);

    const page = (await ownerInbox(owner, '?limit=1')).json();
    expect(page.data).toHaveLength(1);
    expect(page.nextCursor).not.toBeNull();
    expect((await ownerInbox(owner, '?status=bogus')).statusCode).toBe(400);
  });
});

describe('status transitions', () => {
  const statusOf = async (id: string) =>
    (await prisma.enquiry.findUniqueOrThrow({ where: { id } })).status;

  it('starts New, and the first owner reply moves it to Responded', async () => {
    const enquiry = (await enquire(buyer)).json();
    expect(await statusOf(enquiry.id)).toBe('new');
    const threadId = enquiry.conversationId;

    // A buyer follow-up is not a reply.
    await sendText(ctx, buyer, threadId, 'Any update?');
    expect(await statusOf(enquiry.id)).toBe('new');

    const reply = await sendText(ctx, owner, threadId, 'Yes, 500 units are available.');
    expect(await statusOf(enquiry.id)).toBe('responded');
    const stored = await prisma.enquiry.findUniqueOrThrow({ where: { id: enquiry.id } });
    expect(stored.firstResponseAt?.toISOString()).toBe(reply.json().createdAt);

    // The enquiry card in the thread shows the new status.
    const thread = await call(ctx, 'GET', `/v1/conversations/${threadId}/messages`, { as: buyer });
    const card = thread.json().data.find((m: { type: string }) => m.type === 'enquiry');
    expect(card.enquiry.status).toBe('responded');
  });

  it('keeps the time of the first reply when the owner writes again', async () => {
    const enquiry = (await enquire(buyer)).json();
    const first = await sendText(ctx, owner, enquiry.conversationId, 'first');
    await sendText(ctx, owner, enquiry.conversationId, 'second');
    const stored = await prisma.enquiry.findUniqueOrThrow({ where: { id: enquiry.id } });
    expect(stored.firstResponseAt?.toISOString()).toBe(first.json().createdAt);
  });

  it('answers every open enquiry in the thread with one reply', async () => {
    const other = await publishedProduct(businessId, refs, 'Nuts');
    const a = (await enquire(buyer)).json();
    const b = (await enquire(buyer, { productId: other })).json();
    await sendText(ctx, owner, a.conversationId, 'Both are in stock.');
    expect(await statusOf(a.id)).toBe('responded');
    expect(await statusOf(b.id)).toBe('responded');
  });

  it('does not answer an enquiry that arrives after the reply', async () => {
    const other = await publishedProduct(businessId, refs, 'Nuts');
    const a = (await enquire(buyer)).json();
    await sendText(ctx, owner, a.conversationId, 'Reply to the first one.');
    const b = (await enquire(buyer, { productId: other })).json();
    expect(await statusOf(b.id)).toBe('new');
  });

  it('lets the owner close it from any state, and closing twice is fine', async () => {
    const fresh = (await enquire(buyer)).json();
    const closed = await call(ctx, 'PATCH', `/v1/me/business/enquiries/${fresh.id}`, {
      as: owner,
      body: { status: 'closed' },
    });
    expect(closed.statusCode).toBe(200);
    expect(closed.json()).toMatchObject({ status: 'closed', closedAt: expect.any(String) });
    const again = await call(ctx, 'PATCH', `/v1/me/business/enquiries/${fresh.id}`, {
      as: owner,
      body: { status: 'closed' },
    });
    expect(again.json().closedAt).toBe(closed.json().closedAt);

    // A later reply does not reopen it.
    await sendText(ctx, owner, fresh.conversationId, 'Sorry, late reply');
    expect(await statusOf(fresh.id)).toBe('closed');
  });

  it('only accepts closing, from the owner of that business', async () => {
    const enquiry = (await enquire(buyer)).json();
    const url = `/v1/me/business/enquiries/${enquiry.id}`;
    for (const status of ['new', 'responded', 'bogus']) {
      const response = await call(ctx, 'PATCH', url, { as: owner, body: { status } });
      expect(response.statusCode, status).toBe(400);
    }
    expect((await call(ctx, 'PATCH', url, { body: { status: 'closed' } })).statusCode).toBe(401);
    // The buyer has no business, and a rival owner is not the owner of this one.
    const byBuyer = await call(ctx, 'PATCH', url, { as: buyer, body: { status: 'closed' } });
    expect(byBuyer.statusCode).toBe(403);
    const { session: rival } = await signUpOwner(ctx, refs);
    const byRival = await call(ctx, 'PATCH', url, { as: rival, body: { status: 'closed' } });
    expect(byRival.statusCode).toBe(404);
    expect(await statusOf(enquiry.id)).toBe('new');

    const missing = await call(ctx, 'PATCH', `/v1/me/business/enquiries/${randomUUID()}`, {
      as: owner,
      body: { status: 'closed' },
    });
    expect(missing.statusCode).toBe(404);
  });
});

describe('GET /v1/businesses/:id/response-stats', () => {
  /** An enquiry from a fresh buyer, inserted with a chosen age and reply delay in hours. */
  async function seed(index: number, ageDays: number, replyAfterHours: number | null) {
    const user = await prisma.user.create({
      data: {
        phone: `+9196${String(index).padStart(8, '0')}`,
        name: `Buyer ${index}`,
        passwordHash: 'x',
      },
    });
    const createdAt = new Date(Date.now() - ageDays * 86_400_000);
    const conversation = await prisma.conversation.create({
      data: { userId: user.id, businessId },
    });
    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderUserId: user.id,
        senderSide: 'user',
        clientId: randomUUID(),
        requestHash: 'x',
        type: 'enquiry',
        body: MESSAGE,
      },
    });
    await prisma.enquiry.create({
      data: {
        userId: user.id,
        businessId,
        conversationId: conversation.id,
        messageId: message.id,
        message: MESSAGE,
        createdAt,
        status: replyAfterHours === null ? 'new' : 'responded',
        firstResponseAt:
          replyAfterHours === null
            ? null
            : new Date(createdAt.getTime() + replyAfterHours * 3_600_000),
      },
    });
  }
  const stats = () => call(ctx, 'GET', `/v1/businesses/${businessId}/response-stats`);

  it('is public, and hides the numbers below 5 enquiries', async () => {
    for (let i = 0; i < ENQUIRY_LIMITS.statsMinEnquiries - 1; i += 1) await seed(i, 1, 1);
    expect((await stats()).json()).toEqual({
      enquiryCount: 4,
      responseRate: null,
      medianResponseMinutes: null,
    });
  });

  it('counts replies within 24 hours, and takes the median time among the answered', async () => {
    // Answered after 1 h, 2 h and 30 h; one unanswered; one answered after exactly 24 h.
    await seed(1, 5, 1);
    await seed(2, 5, 2);
    await seed(3, 5, 30);
    await seed(4, 5, null);
    await seed(5, 5, 24);
    const body = (await stats()).json();
    expect(body.enquiryCount).toBe(5);
    expect(body.responseRate).toBeCloseTo(3 / 5);
    // Answered delays 1 h, 2 h, 24 h and 30 h: the median is (2 h + 24 h) / 2 = 13 h.
    expect(body.medianResponseMinutes).toBe(13 * 60);
  });

  it('ignores enquiries older than 90 days', async () => {
    for (let i = 0; i < 5; i += 1) await seed(i, 100, 1);
    expect((await stats()).json().enquiryCount).toBe(0);
    await seed(10, 89, 1);
    expect((await stats()).json().enquiryCount).toBe(1);
  });

  it('404s for an unknown or suspended business', async () => {
    expect(
      (await call(ctx, 'GET', `/v1/businesses/${randomUUID()}/response-stats`)).statusCode,
    ).toBe(404);
    await prisma.user.update({ where: { id: owner.user.id }, data: { status: 'suspended' } });
    expect((await stats()).statusCode).toBe(404);
  });
});
