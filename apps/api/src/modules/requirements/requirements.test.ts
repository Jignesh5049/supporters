import { randomUUID } from 'node:crypto';
import { RATE_LIMITS, REQUIREMENT } from '@supporters/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type ReferenceData, call, referenceData, signUpOwner } from '../../test/catalog';
import { openThread, postWithKey, publishedProduct } from '../../test/chat';
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
import { expireRequirements } from './requirements.expiry';

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

const DESCRIPTION = 'Need 500 M8 zinc-plated bolts delivered to our Pune plant.';
const DAY_MS = 24 * 60 * 60 * 1000;

const body = (overrides: object = {}) => ({
  description: DESCRIPTION,
  categoryId: refs.subcategory.id,
  quantity: 500,
  unit: 'piece',
  deliveryCityId: refs.pune.id,
  ...overrides,
});
const post = (as: MobileSession, overrides: object = {}) =>
  call(ctx, 'POST', '/v1/buyer-requirements', { as, body: body(overrides) });

/** A business owner whose business is verified (there is no admin flow yet). */
async function verifiedOwner(overrides: object = {}) {
  const owner = await signUpOwner(ctx, refs, overrides);
  await prisma.business.update({
    where: { id: owner.business.id },
    data: { verificationStatus: 'verified', verifiedAt: new Date() },
  });
  return owner;
}

/** Posts a requirement and runs the matching job, the way the worker does. */
async function postAndMatch(as: MobileSession, overrides: object = {}) {
  // Drop the sign-in events of setup, so inboxes hold only what the test causes.
  await clearOutbox();
  const response = await post(as, overrides);
  if (response.statusCode !== 201) throw new Error(`post failed: ${response.body}`);
  await drainOutbox();
  return response.json<{ id: string }>().id;
}

const quote = (as: MobileSession, id: string, extra: object = {}, key?: string) =>
  postWithKey(
    ctx,
    as,
    `/v1/buyer-requirements/${id}/quotes`,
    { price: { amountPaise: 1_250_00 }, message: 'We can deliver in 5 days.', ...extra },
    key,
  );

describe('POST /v1/buyer-requirements', () => {
  let buyer: MobileSession;
  beforeEach(async () => {
    buyer = await registerMobile(ctx);
  });

  it('rejects guests', async () => {
    const response = await call(ctx, 'POST', '/v1/buyer-requirements', { body: body() });
    expect(response.statusCode).toBe(401);
  });

  it('validates the form', async () => {
    const bad: object[] = [
      { description: 'too short' },
      { description: 'x'.repeat(1_001) },
      { quantity: 0 },
      { unit: 'parsec' },
      { budget: { amountPaise: 0 } },
      { imageIds: [randomUUID(), randomUUID(), randomUUID(), randomUUID()] },
      { status: 'closed' },
      { categoryId: randomUUID() },
      { deliveryCityId: randomUUID() },
      { imageIds: [randomUUID()] },
    ];
    for (const overrides of bad) {
      expect((await post(buyer, overrides)).statusCode, JSON.stringify(overrides)).toBe(400);
    }
  });

  it('posts an open requirement for 30 days and queues the matching', async () => {
    const image = await prisma.upload.create({
      data: {
        userId: buyer.user.id,
        purpose: 'requirement',
        key: `public/requirement/${randomUUID()}`,
        contentType: 'image/jpeg',
        sizeBytes: 1_024,
        status: 'ready',
      },
    });
    const response = await post(buyer, {
      budget: { amountPaise: 5_000_00 },
      imageIds: [image.id],
    });
    expect(response.statusCode).toBe(201);
    const requirement = response.json();
    expect(requirement).toMatchObject({
      status: 'open',
      description: DESCRIPTION,
      category: { id: refs.subcategory.id },
      quantity: 500,
      unit: 'piece',
      deliveryCity: { id: refs.pune.id },
      budget: { amountPaise: 5_000_00, currency: 'INR' },
      images: [{ id: image.id }],
      buyer: { id: buyer.user.id, name: 'Asha Traders' },
      quoteCount: 0,
      isMine: true,
      hasQuoted: false,
    });
    expect(JSON.stringify(requirement)).not.toContain(buyer.phone);
    const lifetime = Date.parse(requirement.expiresAt) - Date.parse(requirement.createdAt);
    expect(lifetime).toBe(REQUIREMENT.openDays * DAY_MS);
    const events = await outboxOf('requirement.created');
    expect(events.map((event) => event.payload)).toEqual([{ requirementId: requirement.id }]);
  });

  it("refuses another user's image", async () => {
    const stranger = await registerMobile(ctx);
    const image = await prisma.upload.create({
      data: {
        userId: stranger.user.id,
        purpose: 'requirement',
        key: `public/requirement/${randomUUID()}`,
        contentType: 'image/jpeg',
        sizeBytes: 1_024,
        status: 'ready',
      },
    });
    expect((await post(buyer, { imageIds: [image.id] })).statusCode).toBe(400);
  });

  it('allows 3 new requirements a day', async () => {
    for (let i = 0; i < RATE_LIMITS.requirementsPerDay; i += 1) {
      expect((await post(buyer)).statusCode).toBe(201);
    }
    const response = await post(buyer);
    expect(response.statusCode).toBe(429);
    expect(problemCode(response)).toBe('RATE_LIMITED');
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('allows 10 open at once, and closing one frees a slot', async () => {
    // Older than a day, so only the open limit applies.
    const old = new Date(Date.now() - 2 * DAY_MS);
    await prisma.buyerRequirement.createMany({
      data: Array.from({ length: RATE_LIMITS.openRequirements }, () => ({
        userId: buyer.user.id,
        categoryId: refs.category.id,
        description: DESCRIPTION,
        quantity: 1,
        unit: 'piece',
        deliveryCityId: refs.pune.id,
        expiresAt: new Date(old.getTime() + REQUIREMENT.openDays * DAY_MS),
        createdAt: old,
      })),
    });
    const blocked = await post(buyer);
    expect(blocked.statusCode).toBe(409);
    expect(problemCode(blocked)).toBe('REQUIREMENT_LIMIT_REACHED');

    const first = await prisma.buyerRequirement.findFirstOrThrow({
      where: { userId: buyer.user.id },
    });
    await call(ctx, 'PATCH', `/v1/buyer-requirements/${first.id}`, {
      as: buyer,
      body: { status: 'closed' },
    });
    expect((await post(buyer)).statusCode).toBe(201);
  });
});

describe('matching', () => {
  it('shows the requirement to businesses in its category that serve the delivery city', async () => {
    const buyer = await registerMobile(ctx);
    // Mumbai, but ships to all India through a published product.
    const shipsEverywhere = await signUpOwner(ctx, refs);
    await publishedProduct(shipsEverywhere.business.id, refs);
    // Based in Pune itself, no listings.
    const local = await signUpOwner(ctx, refs, { cityId: refs.pune.id });
    // Mumbai with no listings: does not reach Pune.
    const tooFar = await signUpOwner(ctx, refs);
    // Ships to Gujarat only.
    const gujaratOnly = await signUpOwner(ctx, refs);
    await prisma.product.create({
      data: {
        businessId: gujaratOnly.business.id,
        categoryId: refs.subcategory.id,
        title: 'Nuts',
        description: 'Seeded',
        status: 'published',
        publishedAt: new Date(),
        isAllIndia: false,
        areaStateIds: [refs.gujarat.id],
      },
    });
    // Wrong category.
    const otherCategory = await signUpOwner(ctx, refs, {
      categoryId: refs.otherCategory.id,
      cityId: refs.pune.id,
    });
    // Suspended owner.
    const suspended = await signUpOwner(ctx, refs, { cityId: refs.pune.id });
    await prisma.user.update({
      where: { id: suspended.session.user.id },
      data: { status: 'suspended' },
    });
    // Blocked by the buyer.
    const blocked = await signUpOwner(ctx, refs, { cityId: refs.pune.id });
    await call(ctx, 'PUT', `/v1/blocks/${blocked.session.user.id}`, { as: buyer });

    const id = await postAndMatch(buyer);
    const matched = await prisma.requirementMatch.findMany({ where: { requirementId: id } });
    expect(matched.map((m) => m.businessId).sort()).toEqual(
      [shipsEverywhere.business.id, local.business.id].sort(),
    );
    for (const outsider of [tooFar, gujaratOnly, otherCategory]) {
      const list = await call(ctx, 'GET', '/v1/buyer-requirements', { as: outsider.session });
      expect(list.json().data).toEqual([]);
    }
    const list = await call(ctx, 'GET', '/v1/buyer-requirements', { as: local.session });
    expect(list.json().data).toMatchObject([{ id, isMine: false, hasQuoted: false }]);
    const requirement = await prisma.buyerRequirement.findUniqueOrThrow({ where: { id } });
    expect(requirement.matchedAt).not.toBeNull();
  });

  it("never matches the buyer's own business", async () => {
    const { session } = await signUpOwner(ctx, refs, { cityId: refs.pune.id });
    const id = await postAndMatch(session);
    expect(await prisma.requirementMatch.count({ where: { requirementId: id } })).toBe(0);
  });

  it('notifies verified businesses only, Premium first, at most 50', async () => {
    const buyer = await registerMobile(ctx);
    const unverified = await signUpOwner(ctx, refs, { cityId: refs.pune.id });
    const premium = await verifiedOwner({ cityId: refs.pune.id });
    await prisma.business.update({
      where: { id: premium.business.id },
      data: { premiumUntil: new Date(Date.now() + 30 * DAY_MS) },
    });
    // 50 more verified businesses in Pune, inserted directly.
    const extra = REQUIREMENT.notifiedBusinessesMax;
    await prisma.user.createMany({
      data: Array.from({ length: extra }, (_, i) => ({
        phone: `+917${String(i).padStart(9, '0')}`,
        name: `Seller ${i}`,
        passwordHash: 'x',
      })),
    });
    const users = await prisma.user.findMany({ where: { name: { startsWith: 'Seller ' } } });
    await prisma.business.createMany({
      data: users.map((user, i) => ({
        ownerUserId: user.id,
        slug: `seller-${i}`,
        name: `Seller ${i}`,
        type: 'wholesaler',
        categoryId: refs.category.id,
        cityId: refs.pune.id,
        stateId: refs.pune.stateId,
        verificationStatus: 'verified',
      })),
    });
    await clearOutbox();

    const id = await postAndMatch(buyer);
    expect(await prisma.requirementMatch.count({ where: { requirementId: id } })).toBe(extra + 2);
    const notified = await prisma.requirementMatch.findMany({
      where: { requirementId: id, notifiedAt: { not: null } },
      orderBy: { rank: 'asc' },
    });
    expect(notified).toHaveLength(REQUIREMENT.notifiedBusinessesMax);
    expect(notified[0]?.businessId).toBe(premium.business.id);
    expect(notified.map((m) => m.businessId)).not.toContain(unverified.business.id);

    const inbox = await inboxOf(premium.session.user.id);
    expect(inbox).toMatchObject([
      {
        type: 'requirement.matched',
        category: 'enquiries',
        actorUserId: buyer.user.id,
        targetType: 'requirement',
        targetId: id,
      },
    ]);
    expect(await inboxOf(unverified.session.user.id)).toEqual([]);
    // Unverified businesses still see it in their list.
    const list = await call(ctx, 'GET', '/v1/buyer-requirements', { as: unverified.session });
    expect(list.json().data).toMatchObject([{ id }]);
  });

  it('skips a requirement closed before the job ran, and runs once', async () => {
    const buyer = await registerMobile(ctx);
    const seller = await verifiedOwner({ cityId: refs.pune.id });
    await clearOutbox();
    const response = await post(buyer);
    const id = response.json().id;
    await call(ctx, 'PATCH', `/v1/buyer-requirements/${id}`, {
      as: buyer,
      body: { status: 'closed' },
    });
    await drainOutbox();
    expect(await prisma.requirementMatch.count()).toBe(0);
    expect(await inboxOf(seller.session.user.id)).toEqual([]);
  });
});

describe('reading requirements', () => {
  let buyer: MobileSession;
  let seller: Awaited<ReturnType<typeof verifiedOwner>>;
  let id: string;

  beforeEach(async () => {
    buyer = await registerMobile(ctx);
    seller = await verifiedOwner({ cityId: refs.pune.id });
    id = await postAndMatch(buyer);
  });

  it('needs a business for the matched list', async () => {
    const response = await call(ctx, 'GET', '/v1/buyer-requirements', { as: buyer });
    expect(response.statusCode).toBe(403);
    expect(problemCode(response)).toBe('BUSINESS_REQUIRED');
    expect((await call(ctx, 'GET', '/v1/buyer-requirements')).statusCode).toBe(401);
  });

  it('pages the matched list, newest first, and hides closed and expired ones', async () => {
    const second = await postAndMatch(buyer, { quantity: 20 });
    const third = await postAndMatch(buyer, { quantity: 30 });
    const page1 = await call(ctx, 'GET', '/v1/buyer-requirements?limit=2', { as: seller.session });
    expect(page1.json().data.map((r: { id: string }) => r.id)).toEqual([third, second]);
    const page2 = await call(
      ctx,
      'GET',
      `/v1/buyer-requirements?limit=2&cursor=${page1.json().nextCursor}`,
      { as: seller.session },
    );
    expect(page2.json()).toMatchObject({ data: [{ id }], nextCursor: null });

    await call(ctx, 'PATCH', `/v1/buyer-requirements/${third}`, {
      as: buyer,
      body: { status: 'fulfilled' },
    });
    await prisma.buyerRequirement.update({
      where: { id: second },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    const after = await call(ctx, 'GET', '/v1/buyer-requirements', { as: seller.session });
    expect(after.json().data.map((r: { id: string }) => r.id)).toEqual([id]);
  });

  it('hides requirements of a buyer who blocked the business', async () => {
    await call(ctx, 'PUT', `/v1/blocks/${seller.session.user.id}`, { as: buyer });
    const list = await call(ctx, 'GET', '/v1/buyer-requirements', { as: seller.session });
    expect(list.json().data).toEqual([]);
    const one = await call(ctx, 'GET', `/v1/buyer-requirements/${id}`, { as: seller.session });
    expect(one.statusCode).toBe(404);
  });

  it('lets the buyer and matched businesses open it, and nobody else', async () => {
    const mine = await call(ctx, 'GET', `/v1/buyer-requirements/${id}`, { as: buyer });
    expect(mine.json()).toMatchObject({ id, isMine: true });
    const matched = await call(ctx, 'GET', `/v1/buyer-requirements/${id}`, { as: seller.session });
    expect(matched.json()).toMatchObject({ id, isMine: false });

    const stranger = await registerMobile(ctx);
    const otherBusiness = await signUpOwner(ctx, refs, { categoryId: refs.otherCategory.id });
    for (const as of [stranger, otherBusiness.session]) {
      const response = await call(ctx, 'GET', `/v1/buyer-requirements/${id}`, { as });
      expect(response.statusCode).toBe(404);
    }
  });

  it("lists the buyer's own requirements by status", async () => {
    const closed = await postAndMatch(buyer);
    await call(ctx, 'PATCH', `/v1/buyer-requirements/${closed}`, {
      as: buyer,
      body: { status: 'closed' },
    });
    const lapsed = await postAndMatch(buyer);
    await prisma.buyerRequirement.update({
      where: { id: lapsed },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    const ids = async (query = '') =>
      (await call(ctx, 'GET', `/v1/me/buyer-requirements${query}`, { as: buyer }))
        .json()
        .data.map((r: { id: string; status: string }) => [r.id, r.status]);
    expect(await ids()).toEqual([
      [lapsed, 'expired'],
      [closed, 'closed'],
      [id, 'open'],
    ]);
    expect(await ids('?status=open')).toEqual([[id, 'open']]);
    expect(await ids('?status=expired')).toEqual([[lapsed, 'expired']]);
    const other = await call(ctx, 'GET', '/v1/me/buyer-requirements', { as: seller.session });
    expect(other.json().data).toEqual([]);
  });
});

describe('PATCH /v1/buyer-requirements/:id', () => {
  it('closes or fulfils an open requirement of the buyer only', async () => {
    const buyer = await registerMobile(ctx);
    const stranger = await registerMobile(ctx);
    const id = (await post(buyer)).json().id;

    const other = await call(ctx, 'PATCH', `/v1/buyer-requirements/${id}`, {
      as: stranger,
      body: { status: 'closed' },
    });
    expect(other.statusCode).toBe(404);
    const reopen = await call(ctx, 'PATCH', `/v1/buyer-requirements/${id}`, {
      as: buyer,
      body: { status: 'open' },
    });
    expect(reopen.statusCode).toBe(400);

    const done = await call(ctx, 'PATCH', `/v1/buyer-requirements/${id}`, {
      as: buyer,
      body: { status: 'fulfilled' },
    });
    expect(done.json()).toMatchObject({ status: 'fulfilled' });
    expect(done.json().closedAt).not.toBeNull();
    const again = await call(ctx, 'PATCH', `/v1/buyer-requirements/${id}`, {
      as: buyer,
      body: { status: 'closed' },
    });
    expect(again.statusCode).toBe(409);
    expect(problemCode(again)).toBe('REQUIREMENT_NOT_OPEN');
  });
});

describe('POST /v1/buyer-requirements/:id/quotes', () => {
  let buyer: MobileSession;
  let seller: Awaited<ReturnType<typeof verifiedOwner>>;
  let id: string;

  beforeEach(async () => {
    buyer = await registerMobile(ctx);
    seller = await verifiedOwner({ cityId: refs.pune.id });
    id = await postAndMatch(buyer);
    await clearOutbox();
  });

  it('needs an Idempotency-Key and a valid body', async () => {
    const noKey = await call(ctx, 'POST', `/v1/buyer-requirements/${id}/quotes`, {
      as: seller.session,
      body: { price: { amountPaise: 100 }, message: 'We can deliver in 5 days.' },
    });
    expect(noKey.statusCode).toBe(400);
    for (const extra of [
      { price: { amountPaise: 0 } },
      { message: 'short' },
      { listing: { type: 'post', id: randomUUID() } },
    ]) {
      expect((await quote(seller.session, id, extra)).statusCode, JSON.stringify(extra)).toBe(400);
    }
  });

  it('posts the quote into a new DM thread and notifies the buyer', async () => {
    const productId = await publishedProduct(seller.business.id, refs);
    const response = await quote(seller.session, id, {
      listing: { type: 'product', id: productId },
    });
    expect(response.statusCode).toBe(201);
    const created = response.json();
    expect(created).toMatchObject({
      requirementId: id,
      business: { id: seller.business.id, isVerified: true },
      price: { amountPaise: 1_250_00, currency: 'INR' },
      message: 'We can deliver in 5 days.',
    });

    const conversation = await prisma.conversation.findFirstOrThrow();
    expect(conversation).toMatchObject({ userId: buyer.user.id, businessId: seller.business.id });
    expect(created.conversationId).toBe(conversation.id);
    const thread = await call(ctx, 'GET', `/v1/conversations/${conversation.id}/messages`, {
      as: buyer,
    });
    expect(thread.json().data).toMatchObject([
      {
        id: created.messageId,
        type: 'quote',
        senderSide: 'business',
        body: 'We can deliver in 5 days.',
        listing: { id: productId },
        quote: { id: created.id, requirementId: id, price: { amountPaise: 1_250_00 } },
      },
    ]);

    const mine = await call(ctx, 'GET', `/v1/buyer-requirements/${id}`, { as: seller.session });
    expect(mine.json()).toMatchObject({ quoteCount: 1, hasQuoted: true });

    // Announced as a quote, not as a plain message.
    expect(await outboxOf('message.created')).toEqual([]);
    await drainOutbox();
    expect(await inboxOf(buyer.user.id)).toMatchObject([
      {
        type: 'requirement.quoted',
        actorUserId: seller.session.user.id,
        targetType: 'requirement',
        targetId: id,
      },
    ]);

    const quotes = await call(ctx, 'GET', `/v1/buyer-requirements/${id}/quotes`, { as: buyer });
    expect(quotes.json()).toMatchObject({ data: [{ id: created.id }], nextCursor: null });
    const notBuyer = await call(ctx, 'GET', `/v1/buyer-requirements/${id}/quotes`, {
      as: seller.session,
    });
    expect(notBuyer.statusCode).toBe(404);
  });

  it('reuses the existing thread', async () => {
    const threadId = await openThread(ctx, buyer, seller.business.id);
    const response = await quote(seller.session, id);
    expect(response.json().conversationId).toBe(threadId);
    expect(await prisma.conversation.count()).toBe(1);
  });

  it('replays a retry and quotes once per business', async () => {
    const key = randomUUID();
    const first = await quote(seller.session, id, {}, key);
    const retry = await quote(seller.session, id, {}, key);
    expect(retry.statusCode).toBe(200);
    expect(retry.json().id).toBe(first.json().id);
    const reused = await quote(seller.session, id, { message: 'Another body entirely.' }, key);
    expect(reused.statusCode).toBe(422);
    expect(problemCode(reused)).toBe('IDEMPOTENCY_KEY_REUSED');

    const second = await quote(seller.session, id, { message: 'A second attempt here.' });
    expect(second.statusCode).toBe(409);
    expect(problemCode(second)).toBe('QUOTE_EXISTS');
    expect(await prisma.requirementQuote.count()).toBe(1);
    expect(await prisma.message.count()).toBe(1);
  });

  it('needs a verified business that was matched', async () => {
    const plain = await registerMobile(ctx);
    const noBusiness = await quote(plain, id);
    expect(noBusiness.statusCode).toBe(403);
    expect(problemCode(noBusiness)).toBe('BUSINESS_REQUIRED');

    const unverified = await signUpOwner(ctx, refs, { cityId: refs.pune.id });
    // Matched now, by a second requirement's job, to show the check is on verification.
    const later = await postAndMatch(buyer, { quantity: 9 });
    const notVerified = await quote(unverified.session, later);
    expect(notVerified.statusCode).toBe(403);
    expect(problemCode(notVerified)).toBe('BUSINESS_NOT_VERIFIED');

    const notMatched = await verifiedOwner({ categoryId: refs.otherCategory.id });
    expect((await quote(notMatched.session, id)).statusCode).toBe(404);
    expect((await quote(seller.session, randomUUID())).statusCode).toBe(404);
  });

  it('refuses closed and expired requirements', async () => {
    await call(ctx, 'PATCH', `/v1/buyer-requirements/${id}`, {
      as: buyer,
      body: { status: 'closed' },
    });
    const closed = await quote(seller.session, id);
    expect(closed.statusCode).toBe(409);
    expect(problemCode(closed)).toBe('REQUIREMENT_NOT_OPEN');

    const lapsed = await postAndMatch(buyer, { quantity: 7 });
    await prisma.buyerRequirement.update({
      where: { id: lapsed },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    expect((await quote(seller.session, lapsed)).statusCode).toBe(409);
  });

  it('refuses a blocked pair', async () => {
    await call(ctx, 'PUT', `/v1/blocks/${buyer.user.id}`, { as: seller.session });
    const response = await quote(seller.session, id);
    expect(response.statusCode).toBe(403);
    expect(problemCode(response)).toBe('BLOCKED');
  });

  it("refuses another business's listing", async () => {
    const other = await signUpOwner(ctx, refs);
    const productId = await publishedProduct(other.business.id, refs);
    const response = await quote(seller.session, id, {
      listing: { type: 'product', id: productId },
    });
    expect(response.statusCode).toBe(400);
  });

  it('allows 50 quotes a day per business', async () => {
    // 50 quotes from the last day, inserted directly on other requirements.
    const conversationId = await openThread(ctx, buyer, seller.business.id);
    for (let i = 0; i < RATE_LIMITS.quotesPerBusinessPerDay; i += 1) {
      const requirement = await prisma.buyerRequirement.create({
        data: {
          userId: buyer.user.id,
          categoryId: refs.category.id,
          description: DESCRIPTION,
          quantity: 1,
          unit: 'piece',
          deliveryCityId: refs.pune.id,
          expiresAt: new Date(Date.now() + DAY_MS),
        },
      });
      const message = await prisma.message.create({
        data: {
          conversationId,
          senderUserId: seller.session.user.id,
          senderSide: 'business',
          clientId: randomUUID(),
          requestHash: 'x',
          type: 'quote',
        },
      });
      await prisma.requirementQuote.create({
        data: {
          requirementId: requirement.id,
          businessId: seller.business.id,
          pricePaise: 100n,
          message: 'Seeded quote',
          conversationId,
          messageId: message.id,
        },
      });
    }
    const response = await quote(seller.session, id);
    expect(response.statusCode).toBe(429);
    expect(problemCode(response)).toBe('RATE_LIMITED');
  });
});

describe('expiry', () => {
  it('expires open requirements after 30 days', async () => {
    const buyer = await registerMobile(ctx);
    const id = (await post(buyer)).json().id;
    const keep = (await post(buyer)).json().id;
    await prisma.buyerRequirement.update({
      where: { id },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    expect(await expireRequirements(prisma)).toBe(1);
    const rows = await prisma.buyerRequirement.findMany({ orderBy: { id: 'asc' } });
    expect(rows.map((row) => [row.id, row.status])).toEqual([
      [id, 'expired'],
      [keep, 'open'],
    ]);
    expect(rows[0]?.closedAt).not.toBeNull();
    expect(await expireRequirements(prisma)).toBe(0);
  });
});
