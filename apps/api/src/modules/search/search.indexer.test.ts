import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { inject } from 'vitest';
import { relayOutbox } from '../../jobs/outbox-relay';
import { startNotificationWorker } from '../../jobs/worker';
import { type ReferenceData, call, referenceData, signUpOwner } from '../../test/catalog';
import {
  type TestContext,
  createTestApp,
  prisma,
  registerMobile,
  resetState,
  valkey,
} from '../../test/helpers';
import { recomputeRating } from '../reviews/reviews.service';
import { FakeEmail, FakeExpo } from '../../test/notifications';
import {
  createProduct,
  createService,
  docOf,
  drainSearch,
  indexedIds,
  indexer,
  meili,
  resetSearch,
} from '../../test/search';
import { publishedPostBody } from '../../test/social';
import { SEARCH_INDEX, createMeili } from './meili';
import { recordPremiumExpirySyncs, recordSearchSync } from './search.sync';

let ctx: TestContext;
let refs: ReferenceData;

beforeAll(async () => {
  ctx = await createTestApp();
  refs = await referenceData();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await resetState();
  await resetSearch();
});

describe('search indexing', () => {
  it('follows a product through create, update, unpublish, republish and delete', async () => {
    const owner = await signUpOwner(ctx, refs);
    const productId = await createProduct(ctx, owner.session, refs, {
      title: 'Brass hinges',
      price: { amountPaise: 2_500 },
      specs: [{ key: 'Finish', value: 'Antique' }],
    });
    await createProduct(ctx, owner.session, refs, {
      title: 'Brass draft',
      status: 'draft',
      mediaIds: [],
    });
    await drainSearch();
    expect(await indexedIds('product')).toEqual([productId]);
    expect(await docOf('product', productId)).toMatchObject({
      title: 'Brass hinges',
      businessId: owner.business.id,
      businessName: 'Asha Traders',
      categorySlugs: [refs.subcategory.slug, refs.category.slug],
      cityId: refs.mumbai.id,
      stateCode: 'MH',
      pricePaise: 2_500,
      moq: 1,
      details: ['Antique'],
      isVerified: false,
    });

    const edit = (body: object) =>
      call(ctx, 'PATCH', `/v1/me/business/products/${productId}`, { as: owner.session, body });
    expect((await edit({ title: 'Copper hinges', price: null })).statusCode).toBe(200);
    await drainSearch();
    const updated = await docOf('product', productId);
    expect(updated).toMatchObject({ title: 'Copper hinges' });
    // "Ask for price" has no price field, so price filters skip it and price sorts put it last.
    expect(updated).not.toHaveProperty('pricePaise');

    expect((await edit({ status: 'archived' })).statusCode).toBe(200);
    await drainSearch();
    expect(await indexedIds('product')).toEqual([]);

    expect((await edit({ status: 'published' })).statusCode).toBe(200);
    await drainSearch();
    expect(await indexedIds('product')).toEqual([productId]);

    const removed = await call(ctx, 'DELETE', `/v1/me/business/products/${productId}`, {
      as: owner.session,
    });
    expect(removed.statusCode).toBe(204);
    await drainSearch();
    expect(await indexedIds('product')).toEqual([]);
  });

  it('indexes services and posts, and drops a deleted post', async () => {
    const owner = await signUpOwner(ctx, refs);
    const serviceId = await createService(ctx, owner.session, refs, {
      title: 'Laser cutting',
      features: ['Up to 20 mm steel'],
    });
    const post = await call(ctx, 'POST', '/v1/me/business/posts', {
      as: owner.session,
      body: {
        ...(await publishedPostBody(owner.session.user.id)),
        body: 'Diwali offer on cutting',
      },
    });
    const postId = post.json<{ id: string }>().id;
    await drainSearch();
    expect(await docOf('service', serviceId)).toMatchObject({
      title: 'Laser cutting',
      details: ['Up to 20 mm steel'],
      categorySlugs: [refs.otherCategory.slug],
    });
    expect(await docOf('post', postId)).toMatchObject({
      body: 'Diwali offer on cutting',
      postType: 'update',
      categorySlugs: [refs.category.slug],
    });

    await call(ctx, 'DELETE', `/v1/me/business/posts/${postId}`, { as: owner.session });
    await drainSearch();
    expect(await indexedIds('post')).toEqual([]);
  });

  it('copies business changes onto its listings and posts', async () => {
    const owner = await signUpOwner(ctx, refs, { name: 'Asha Traders' });
    const productId = await createProduct(ctx, owner.session, refs);
    await drainSearch();
    expect(await docOf('business', owner.business.id)).toMatchObject({
      name: 'Asha Traders',
      businessType: 'wholesaler',
      categorySlugs: [refs.category.slug],
    });

    const renamed = await call(ctx, 'PATCH', '/v1/me/business', {
      as: owner.session,
      body: { name: 'Kiran Exports', cityId: refs.pune.id },
    });
    expect(renamed.statusCode).toBe(200);
    await drainSearch();
    expect(await docOf('product', productId)).toMatchObject({
      businessName: 'Kiran Exports',
      cityId: refs.pune.id,
    });
    expect(await docOf('business', owner.business.id)).toMatchObject({ name: 'Kiran Exports' });
  });

  it('removes everything of a suspended owner when their business is synced', async () => {
    const owner = await signUpOwner(ctx, refs);
    await createProduct(ctx, owner.session, refs);
    await createService(ctx, owner.session, refs);
    await drainSearch();
    expect(await indexedIds('business')).toEqual([owner.business.id]);

    // Admin actions record the sync in their transaction; the business cascades.
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: owner.session.user.id }, data: { status: 'suspended' } });
      await recordSearchSync(tx, 'business', owner.business.id);
    });
    await drainSearch();
    expect(await indexedIds('business')).toEqual([]);
    expect(await indexedIds('product')).toEqual([]);
    expect(await indexedIds('service')).toEqual([]);
  });

  it('rolls the sync back with the write', async () => {
    const owner = await signUpOwner(ctx, refs);
    const before = await prisma.outboxEvent.count({ where: { type: 'search.sync' } });
    const missing = await call(ctx, 'DELETE', `/v1/me/business/products/${randomUUID()}`, {
      as: owner.session,
    });
    expect(missing.statusCode).toBe(404);
    expect(await prisma.outboxEvent.count({ where: { type: 'search.sync' } })).toBe(before);
  });

  it('boosts Premium sellers and drops the boost when Premium ends', async () => {
    const plain = await signUpOwner(ctx, refs, { name: 'Plain Co' });
    const premium = await signUpOwner(ctx, refs, { name: 'Premium Co' });
    const plainId = await createProduct(ctx, plain.session, refs, { title: 'Steel bolts' });
    const premiumId = await createProduct(ctx, premium.session, refs, { title: 'Steel bolts' });
    const ends = new Date(Date.now() + 60 * 60_000);
    await prisma.$transaction(async (tx) => {
      await tx.business.update({
        where: { id: premium.business.id },
        data: { premiumUntil: ends },
      });
      await recordSearchSync(tx, 'business', premium.business.id);
    });
    await drainSearch();
    expect(await docOf('product', premiumId)).toMatchObject({ featured: 1 });
    const searchOnly = createMeili(inject('meiliUrl'), inject('meiliSearchKey'));
    const ranked = () =>
      searchOnly
        .index<{ id: string }>(SEARCH_INDEX.product)
        .search('steel bolts', { attributesToRetrieve: ['id'] })
        .then((result) => result.hits.map((hit) => hit.id));
    expect(await ranked()).toEqual([premiumId, plainId]);

    // An hour later Premium has ended; the hourly job queues the sync.
    const later = new Date(ends.getTime() + 60_000);
    expect(await recordPremiumExpirySyncs(prisma, later)).toBe(1);
    await prisma.business.update({
      where: { id: premium.business.id },
      data: { premiumUntil: new Date(Date.now() - 1_000) },
    });
    await drainSearch();
    expect(await docOf('product', premiumId)).toMatchObject({ featured: 0 });
    expect(await recordPremiumExpirySyncs(prisma, new Date(later.getTime() + 4 * 3600_000))).toBe(
      0,
    );
  });

  it('indexes the shown rating once a business has 3 visible reviews', async () => {
    const { business } = await signUpOwner(ctx, refs, { name: 'Rated Co' });
    const [first, second, third] = await Promise.all([1, 2, 3].map(() => registerMobile(ctx)));
    if (!first || !second || !third) throw new Error('setup failed');
    const review = async (userId: string, rating: number) =>
      prisma.$transaction(async (tx) => {
        const row = await tx.review.create({
          data: { userId, businessId: business.id, rating, body: 'Seeded review body text.' },
        });
        await recomputeRating(tx, business.id);
        return row.id;
      });
    const search = async (query: string) =>
      (await call(ctx, 'GET', `/v1/search?type=business&${query}`))
        .json<{
          data: { business: { id: string; rating: number | null; reviewCount: number } }[];
        }>()
        .data.map((hit) => hit.business);

    await review(first.user.id, 5);
    await review(second.user.id, 4);
    await drainSearch();
    // "New": no rating field, so ratingMin leaves it out.
    expect(await docOf('business', business.id)).not.toHaveProperty('rating');
    expect(await search('ratingMin=1')).toEqual([]);
    expect(await search('q=rated')).toMatchObject([{ rating: null, reviewCount: 2 }]);

    const thirdId = await review(third.user.id, 4);
    await drainSearch();
    expect(await docOf('business', business.id)).toMatchObject({ rating: 4.3 });
    expect(await search('ratingMin=4')).toMatchObject([
      { id: business.id, rating: 4.3, reviewCount: 3 },
    ]);

    // Moderation hides a review through the same recompute, so the index follows.
    await prisma.$transaction(async (tx) => {
      await tx.review.update({ where: { id: thirdId }, data: { hiddenAt: new Date() } });
      await recomputeRating(tx, business.id);
    });
    await drainSearch();
    expect(await docOf('business', business.id)).not.toHaveProperty('rating');
  });

  it('rebuilds everything with a full reindex', async () => {
    const owner = await signUpOwner(ctx, refs);
    const productId = await createProduct(ctx, owner.session, refs);
    // Not drained: a lost job. Plus a stale document that no longer exists.
    await meili
      .index(SEARCH_INDEX.product)
      .addDocuments([{ id: '0199f4a0-0000-7000-8000-000000000999', title: 'Ghost' }])
      .waitTask();
    await indexer.reindexAll();
    expect(await indexedIds('business')).toEqual([owner.business.id]);
    expect(await indexedIds('product')).toEqual([productId]);
  });

  it('routes search.sync events to the search-index queue', async () => {
    await signUpOwner(ctx, refs);
    await prisma.outboxEvent.create({ data: { type: 'post.liked', payload: {} } });
    const others = await prisma.outboxEvent.findMany({
      where: { type: { not: 'search.sync' } },
      orderBy: { id: 'asc' },
    });
    const fanout: string[] = [];
    const searchJobs: string[] = [];
    await relayOutbox(prisma, {
      notifications: { addBulk: async (jobs) => fanout.push(...jobs.map((job) => job.opts.jobId)) },
      searchIndex: {
        addBulk: async (jobs) => searchJobs.push(...jobs.map((job) => job.opts.jobId)),
      },
      media: { addBulk: async () => 0 },
    });
    const syncs = await prisma.outboxEvent.findMany({
      where: { type: 'search.sync' },
      orderBy: { id: 'asc' },
    });
    expect(syncs.length).toBeGreaterThan(0);
    expect(searchJobs).toEqual(syncs.map((event) => `search-${event.id}`));
    expect(fanout).toEqual(others.map((event) => `evt-${event.id}`));
  });

  it('is kept up to date by the worker through the outbox', async () => {
    const worker = await startNotificationWorker({
      env: ctx.env,
      prisma,
      valkey,
      expo: new FakeExpo(),
      webPush: null,
      email: new FakeEmail(),
      searchIndexer: indexer,
      log: ctx.app.log,
      backoffMs: 5,
      relayIntervalMs: 20,
      prefix: `test-${randomUUID()}`,
      isCleanupScheduled: false,
    });
    try {
      const owner = await signUpOwner(ctx, refs);
      const productId = await createProduct(ctx, owner.session, refs);
      await vi.waitFor(
        async () => {
          const pending = await prisma.outboxEvent.count({
            where: { type: 'search.sync', processedAt: null },
          });
          expect(pending).toBe(0);
        },
        { timeout: 15_000, interval: 100 },
      );
      expect(await indexedIds('product')).toEqual([productId]);
      expect(await indexedIds('business')).toEqual([owner.business.id]);
    } finally {
      // Closed before the next test's reset, so no job writes while tables are truncated.
      await worker.close();
    }
  });

  it('uses scoped keys: the search key can neither write nor manage keys', async () => {
    const searchOnly = createMeili(inject('meiliUrl'), inject('meiliSearchKey'));
    await expect(
      searchOnly.index(SEARCH_INDEX.business).addDocuments([{ id: 'x' }]),
    ).rejects.toThrow();
    await expect(searchOnly.getKeys()).rejects.toThrow();
    await expect(meili.getKeys()).rejects.toThrow();
  });
});
