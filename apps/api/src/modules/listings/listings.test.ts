import { PLAN_LIMITS } from '@supporters/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  type ReferenceData,
  call,
  productBody,
  readyUpload,
  referenceData,
  serviceBody,
  signUpOwner,
} from '../../test/catalog';
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

const kinds = [
  { kind: 'products', body: () => productBody(refs) },
  { kind: 'services', body: () => serviceBody(refs) },
] as const;

/** Inserts published listings straight into the database, to reach the plan limit quickly. */
async function seedPublished(businessId: string, count: number) {
  const row = { businessId, categoryId: refs.category.id, description: 'Seeded' };
  const products = Math.ceil(count / 2);
  await prisma.product.createMany({
    data: Array.from({ length: products }, (_, i) => ({
      ...row,
      title: `Product ${i}`,
      status: 'published' as const,
    })),
  });
  await prisma.service.createMany({
    data: Array.from({ length: count - products }, (_, i) => ({
      ...row,
      title: `Service ${i}`,
      status: 'published' as const,
    })),
  });
}

describe.each(kinds)('$kind: authorization matrix', ({ kind, body }) => {
  let owner: MobileSession;
  let otherOwner: MobileSession;
  let stranger: MobileSession;
  let listingId: string;

  beforeEach(async () => {
    ({ session: owner } = await signUpOwner(ctx, refs));
    ({ session: otherOwner } = await signUpOwner(ctx, refs));
    stranger = await registerMobile(ctx);
    const created = await call(ctx, 'POST', `/v1/me/business/${kind}`, {
      as: owner,
      body: body(),
    });
    listingId = created.json().id;
  });

  it('rejects guests on every owner route', async () => {
    const url = `/v1/me/business/${kind}`;
    expect((await call(ctx, 'GET', url)).statusCode).toBe(401);
    expect((await call(ctx, 'POST', url, { body: body() })).statusCode).toBe(401);
    expect((await call(ctx, 'PATCH', `${url}/${listingId}`, { body: {} })).statusCode).toBe(401);
    expect((await call(ctx, 'DELETE', `${url}/${listingId}`)).statusCode).toBe(401);
  });

  it('asks users without a business to create one first', async () => {
    const response = await call(ctx, 'POST', `/v1/me/business/${kind}`, {
      as: stranger,
      body: body(),
    });
    expect(response.statusCode).toBe(403);
    expect(problemCode(response)).toBe('BUSINESS_REQUIRED');
  });

  it("hides another business's listing from its writes and its list", async () => {
    const url = `/v1/me/business/${kind}/${listingId}`;
    const patch = await call(ctx, 'PATCH', url, { as: otherOwner, body: { title: 'Mine now' } });
    expect(patch.statusCode).toBe(404);
    expect((await call(ctx, 'DELETE', url, { as: otherOwner })).statusCode).toBe(404);
    const list = await call(ctx, 'GET', `/v1/me/business/${kind}`, { as: otherOwner });
    expect(list.json().data).toEqual([]);

    const unchanged = await call(ctx, 'GET', `/v1/me/business/${kind}`, { as: owner });
    expect(unchanged.json().data[0].title).toBe(body().title);
  });

  it('lets the owner update and delete', async () => {
    const url = `/v1/me/business/${kind}/${listingId}`;
    const patch = await call(ctx, 'PATCH', url, { as: owner, body: { title: 'Renamed' } });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().title).toBe('Renamed');
    expect((await call(ctx, 'DELETE', url, { as: owner })).statusCode).toBe(204);
    expect((await call(ctx, 'DELETE', url, { as: owner })).statusCode).toBe(404);
  });
});

describe('products: lifecycle', () => {
  it('creates a draft, publishes it, shows it publicly, then deletes it', async () => {
    const { session, business } = await signUpOwner(ctx, refs);
    const created = await call(ctx, 'POST', '/v1/me/business/products', {
      as: session,
      body: productBody(refs, {
        price: { amountPaise: 4_500 },
        originalPrice: { amountPaise: 5_000, currency: 'INR' },
        unit: 'box',
        moq: 10,
        shippingArea: { allIndia: false, stateIds: [refs.gujarat.id] },
        specs: [{ key: 'Grade', value: '8.8' }],
      }),
    });
    expect(created.statusCode).toBe(201);
    const product = created.json();
    expect(product).toMatchObject({
      status: 'draft',
      publishedAt: null,
      price: { amountPaise: 4_500, currency: 'INR' },
      originalPrice: { amountPaise: 5_000, currency: 'INR' },
      shippingArea: { allIndia: false, states: [{ code: 'GJ', name: 'Gujarat' }], cities: [] },
      business: { id: business.id, slug: business.slug, isVerified: false },
    });

    // Drafts are not public.
    expect((await call(ctx, 'GET', `/v1/products/${product.id}`)).statusCode).toBe(404);
    const emptyTab = await call(ctx, 'GET', `/v1/businesses/${business.id}/products`);
    expect(emptyTab.json()).toEqual({ data: [], nextCursor: null });

    const published = await call(ctx, 'PATCH', `/v1/me/business/products/${product.id}`, {
      as: session,
      body: { status: 'published', price: null, mediaIds: [await readyUpload(session.user.id)] },
    });
    expect(published.json()).toMatchObject({ status: 'published', price: null });
    expect(published.json().publishedAt).not.toBeNull();

    const publicView = await call(ctx, 'GET', `/v1/products/${product.id}`);
    expect(publicView.statusCode).toBe(200);
    expect(publicView.json().price).toBeNull(); // "Ask for price"
    const tab = await call(ctx, 'GET', `/v1/businesses/${business.id}/products`);
    expect(tab.json<{ data: { id: string }[] }>().data.map((item) => item.id)).toEqual([
      product.id,
    ]);

    await call(ctx, 'DELETE', `/v1/me/business/products/${product.id}`, { as: session });
    expect((await call(ctx, 'GET', `/v1/products/${product.id}`)).statusCode).toBe(404);
  });

  it('validates prices against the stored values and area ids', async () => {
    const { session } = await signUpOwner(ctx, refs);
    const created = await call(ctx, 'POST', '/v1/me/business/products', {
      as: session,
      body: productBody(refs, { originalPrice: { amountPaise: 5_000 } }),
    });
    const url = `/v1/me/business/products/${created.json().id}`;

    const tooHigh = await call(ctx, 'PATCH', url, {
      as: session,
      body: { price: { amountPaise: 6_000 } },
    });
    expect(tooHigh.statusCode).toBe(400);
    expect(tooHigh.json().errors[0].path).toBe('body.originalPrice');

    const unknownState = await call(ctx, 'POST', '/v1/me/business/products', {
      as: session,
      body: productBody(refs, {
        shippingArea: { allIndia: false, stateIds: [crypto.randomUUID()] },
      }),
    });
    expect(unknownState.json().errors[0].path).toBe('body.shippingArea.stateIds');

    const unknownCategory = await call(ctx, 'POST', '/v1/me/business/products', {
      as: session,
      body: productBody(refs, { categoryId: crypto.randomUUID() }),
    });
    expect(unknownCategory.json().errors[0].path).toBe('body.categoryId');
  });

  it('pages newest first with an opaque cursor', async () => {
    const { session } = await signUpOwner(ctx, refs);
    const ids: string[] = [];
    for (const title of ['One', 'Two', 'Three']) {
      const created = await call(ctx, 'POST', '/v1/me/business/products', {
        as: session,
        body: productBody(refs, { title }),
      });
      ids.push(created.json().id);
    }
    const first = await call(ctx, 'GET', '/v1/me/business/products?limit=2', { as: session });
    expect(first.json<{ data: { id: string }[] }>().data.map((item) => item.id)).toEqual([
      ids[2],
      ids[1],
    ]);
    const cursor: string = first.json().nextCursor;
    expect(cursor).toEqual(expect.any(String));

    const second = await call(ctx, 'GET', `/v1/me/business/products?limit=2&cursor=${cursor}`, {
      as: session,
    });
    expect(second.json()).toMatchObject({ data: [{ id: ids[0] }], nextCursor: null });

    const bad = await call(ctx, 'GET', '/v1/me/business/products?cursor=nope', { as: session });
    expect(problemCode(bad)).toBe('VALIDATION_FAILED');
    const tooMany = await call(ctx, 'GET', '/v1/me/business/products?limit=51', { as: session });
    expect(tooMany.statusCode).toBe(400);
  });

  it('returns 404 for the tabs of an unknown business', async () => {
    const response = await call(ctx, 'GET', `/v1/businesses/${crypto.randomUUID()}/services`);
    expect(response.statusCode).toBe(404);
  });
});

describe('services: lifecycle', () => {
  it('stores cities and states in the service area, and features', async () => {
    const { session } = await signUpOwner(ctx, refs);
    const created = await call(ctx, 'POST', '/v1/me/business/services', {
      as: session,
      body: serviceBody(refs, {
        status: 'published',
        mediaIds: [await readyUpload(session.user.id)],
        price: { amountPaise: 150_000 },
        priceUnit: 'per_job',
        serviceArea: { allIndia: false, cityIds: [refs.pune.id], stateIds: [refs.gujarat.id] },
        features: ['Free pickup', 'GST invoice'],
      }),
    });
    expect(created.statusCode).toBe(201);
    const publicView = await call(ctx, 'GET', `/v1/services/${created.json().id}`);
    expect(publicView.json()).toMatchObject({
      priceUnit: 'per_job',
      features: ['Free pickup', 'GST invoice'],
      serviceArea: {
        allIndia: false,
        states: [{ code: 'GJ' }],
        cities: [{ name: 'Pune', stateCode: 'MH' }],
      },
    });
  });
});

describe('free plan publish limit', () => {
  const limit = PLAN_LIMITS.free.publishedListings;

  it('counts products and services together, and stops at the limit', async () => {
    const { session, business } = await signUpOwner(ctx, refs);
    await seedPublished(business.id, limit - 1);

    const last = await call(ctx, 'POST', '/v1/me/business/services', {
      as: session,
      body: serviceBody(refs, {
        status: 'published',
        mediaIds: [await readyUpload(session.user.id)],
      }),
    });
    expect(last.statusCode).toBe(201);

    const overCreate = await call(ctx, 'POST', '/v1/me/business/products', {
      as: session,
      body: productBody(refs, {
        status: 'published',
        mediaIds: [await readyUpload(session.user.id)],
      }),
    });
    expect(overCreate.statusCode).toBe(409);
    expect(problemCode(overCreate)).toBe('LISTING_LIMIT_REACHED');

    // Drafts are still allowed, but can't be published.
    const draft = await call(ctx, 'POST', '/v1/me/business/products', {
      as: session,
      body: productBody(refs),
    });
    expect(draft.statusCode).toBe(201);
    const publish = await call(ctx, 'PATCH', `/v1/me/business/products/${draft.json().id}`, {
      as: session,
      body: { status: 'published', mediaIds: [await readyUpload(session.user.id)] },
    });
    expect(problemCode(publish)).toBe('LISTING_LIMIT_REACHED');

    // Archiving one frees a slot.
    await call(ctx, 'PATCH', `/v1/me/business/services/${last.json().id}`, {
      as: session,
      body: { status: 'archived' },
    });
    const retry = await call(ctx, 'PATCH', `/v1/me/business/products/${draft.json().id}`, {
      as: session,
      body: { status: 'published', mediaIds: [await readyUpload(session.user.id)] },
    });
    expect(retry.statusCode).toBe(200);

    const me = await call(ctx, 'GET', '/v1/me/business', { as: session });
    expect(me.json()).toMatchObject({ publishedListings: limit, publishedListingsLimit: limit });
  });

  it('lets only one of two concurrent publishes take the last slot', async () => {
    const { session, business } = await signUpOwner(ctx, refs);
    await seedPublished(business.id, limit - 1);
    const responses = await Promise.all([
      call(ctx, 'POST', '/v1/me/business/products', {
        as: session,
        body: productBody(refs, {
          status: 'published',
          mediaIds: [await readyUpload(session.user.id)],
        }),
      }),
      call(ctx, 'POST', '/v1/me/business/services', {
        as: session,
        body: serviceBody(refs, {
          status: 'published',
          mediaIds: [await readyUpload(session.user.id)],
        }),
      }),
    ]);
    expect(responses.map((response) => response.statusCode).sort()).toEqual([201, 409]);
  });

  it('does not apply to Premium businesses', async () => {
    const { session, business } = await signUpOwner(ctx, refs);
    await prisma.business.update({
      where: { id: business.id },
      data: { premiumUntil: new Date(Date.now() + 86_400_000) },
    });
    await seedPublished(business.id, limit);
    const response = await call(ctx, 'POST', '/v1/me/business/products', {
      as: session,
      body: productBody(refs, {
        status: 'published',
        mediaIds: [await readyUpload(session.user.id)],
      }),
    });
    expect(response.statusCode).toBe(201);
    const me = await call(ctx, 'GET', '/v1/me/business', { as: session });
    expect(me.json()).toMatchObject({ isPremium: true, publishedListingsLimit: null });
  });
});
