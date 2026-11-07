import { RATE_LIMITS, SEARCH_LIMITS } from '@supporters/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type ReferenceData, call, referenceData, signUpOwner } from '../../test/catalog';
import {
  type TestContext,
  createTestApp,
  nextIp,
  prisma,
  problemCode,
  resetState,
} from '../../test/helpers';
import { createProduct, createService, drainSearch, hitIds, resetSearch } from '../../test/search';
import { recordSearchSync } from './search.sync';
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

const sorted = (body: Parameters<typeof hitIds>[0]) => hitIds(body).sort();

const search = async (query: string) => {
  const response = await call(ctx, 'GET', `/v1/search?${query}`);
  expect(response.statusCode, response.body).toBe(200);
  return response.json<{
    data: { type: string; business?: { id: string }; listing?: { id: string } }[];
    nextCursor: string | null;
    estimatedTotal: number;
  }>();
};

describe('stale index entries', () => {
  it('are never shown: results are re-read from PostgreSQL', async () => {
    const owner = await signUpOwner(ctx, refs, { name: 'Shady Supplies' });
    await createProduct(ctx, owner.session, refs, { title: 'Shady bolts' });
    await drainSearch();
    expect((await search('type=business&q=shady')).data).toHaveLength(1);

    // Suspended, but not reindexed yet.
    await prisma.user.update({
      where: { id: owner.session.user.id },
      data: { status: 'suspended' },
    });
    expect((await search('type=business&q=shady')).data).toEqual([]);
    expect((await search('type=product&q=shady')).data).toEqual([]);
    const suggest = await call(ctx, 'GET', '/v1/search/suggest?q=shady');
    expect(suggest.json()).toEqual({ data: [] });
  });
});

describe('GET /v1/search', () => {
  let ids: Record<string, string>;

  beforeEach(async () => {
    const gujaratCity = await prisma.city.findFirstOrThrow({ where: { stateId: refs.gujarat.id } });
    const asha = await signUpOwner(ctx, refs, { name: 'Asha Bolts', type: 'manufacturer' });
    const kiran = await signUpOwner(ctx, refs, {
      name: 'Kiran Fasteners',
      type: 'wholesaler',
      cityId: gujaratCity.id,
      categoryId: refs.otherCategory.id,
    });
    await prisma.business.update({
      where: { id: kiran.business.id },
      data: { verificationStatus: 'verified' },
    });
    ids = {
      asha: asha.business.id,
      kiran: kiran.business.id,
      cheap: await createProduct(ctx, asha.session, refs, {
        title: 'Steel bolts',
        price: { amountPaise: 1_000 },
        moq: 100,
      }),
      dear: await createProduct(ctx, kiran.session, refs, {
        title: 'Titanium bolts',
        categoryId: refs.otherCategory.id,
        price: { amountPaise: 90_000 },
        availability: 'made_to_order',
      }),
      unpriced: await createProduct(ctx, kiran.session, refs, { title: 'Brass bolts' }),
      service: await createService(ctx, asha.session, refs, {
        title: 'Bolt threading',
        price: { amountPaise: 50_000 },
        availability: 'immediate',
      }),
    };
    // Verification is not an API write yet; record its sync the way the admin flow will.
    await prisma.$transaction((tx) => recordSearchSync(tx, 'business', kiran.business.id));
    await drainSearch();
  });

  it('finds businesses by default, typo-tolerant', async () => {
    const result = await search('q=fastners');
    expect(result.data).toEqual([
      {
        type: 'business',
        business: expect.objectContaining({
          id: ids.kiran,
          name: 'Kiran Fasteners',
          isVerified: true,
          rating: null,
          reviewCount: 0,
          category: expect.objectContaining({ id: refs.otherCategory.id }),
        }),
      },
    ]);
    expect(JSON.stringify(result)).not.toMatch(/contactPhone|gstin|ownerUserId/);
  });

  it('filters by category (both levels), place, business type and badge', async () => {
    // The product's category is a subcategory; its parent's slug matches it too.
    const both = [ids.cheap, ids.unpriced].sort();
    expect(sorted(await search(`type=product&category=${refs.category.slug}`))).toEqual(both);
    expect(sorted(await search(`type=product&category=${refs.subcategory.slug}`))).toEqual(both);
    expect(sorted(await search(`type=product&category=${refs.otherCategory.slug}`))).toEqual([
      ids.dear,
    ]);
    expect(hitIds(await search(`type=business&city=${refs.mumbai.id}`))).toEqual([ids.asha]);
    expect(hitIds(await search('type=business&state=gj'))).toEqual([ids.kiran]);
    expect(hitIds(await search('type=product&businessType=manufacturer'))).toEqual([ids.cheap]);
    expect((await search('type=product&verified=true&sort=newest')).data).toHaveLength(2);
    expect((await search('type=product&verified=false')).data).toHaveLength(3);
  });

  it('filters listings by price, availability and MOQ', async () => {
    expect(hitIds(await search('type=product&priceMin=500&priceMax=5000'))).toEqual([ids.cheap]);
    expect(hitIds(await search('type=product&priceMin=500&sort=price_asc'))).toEqual([
      ids.cheap,
      ids.dear,
    ]);
    expect(hitIds(await search('type=product&availability=made_to_order'))).toEqual([ids.dear]);
    expect(hitIds(await search('type=product&moqMax=10&sort=price_asc'))).toEqual([
      ids.dear,
      ids.unpriced,
    ]);
    expect(hitIds(await search('type=service&priceMax=60000&availability=immediate'))).toEqual([
      ids.service,
    ]);
    // Filters for other types are ignored; ratingMin leaves out businesses with no rating.
    expect(hitIds(await search('type=service&moqMax=1&availability=in_stock'))).toEqual([
      ids.service,
    ]);
    expect((await search('type=business&ratingMin=4')).data).toEqual([]);
  });

  it('sorts by price both ways, with "Ask for price" last', async () => {
    expect(hitIds(await search('type=product&q=bolts&sort=price_asc'))).toEqual([
      ids.cheap,
      ids.dear,
      ids.unpriced,
    ]);
    expect(hitIds(await search('type=product&q=bolts&sort=price_desc'))).toEqual([
      ids.dear,
      ids.cheap,
      ids.unpriced,
    ]);
    expect(hitIds(await search('type=product&sort=newest'))).toEqual([
      ids.unpriced,
      ids.dear,
      ids.cheap,
    ]);
    expect((await search('type=business&sort=rating')).data).toHaveLength(2);
  });

  it('pages with an opaque cursor', async () => {
    const first = await search('type=product&sort=price_asc&limit=2');
    expect(hitIds(first)).toEqual([ids.cheap, ids.dear]);
    expect(first.estimatedTotal).toBe(3);
    const second = await search(
      `type=product&sort=price_asc&limit=2&cursor=${first.nextCursor ?? ''}`,
    );
    expect(hitIds(second)).toEqual([ids.unpriced]);
    expect(second.nextCursor).toBeNull();
  });

  it('rejects bad input', async () => {
    for (const query of [
      'cursor=not-a-cursor',
      `cursor=${Buffer.from(`o:${SEARCH_LIMITS.maxTotalHits + 1}`).toString('base64url')}`,
      'type=people',
      'sort=cheapest',
      'priceMin=10&priceMax=1',
      'limit=51',
      'evil=1',
      `q=${'a'.repeat(SEARCH_LIMITS.queryMax + 1)}`,
    ]) {
      const response = await call(ctx, 'GET', `/v1/search?${query}`);
      expect(response.statusCode, query).toBe(400);
      expect(problemCode(response)).toBe('VALIDATION_FAILED');
    }
  });

  it('treats query text as text, not filter syntax', async () => {
    const result = await search(`q=${encodeURIComponent('bolts" OR isVerified = true')}`);
    expect(result.data.length).toBeLessThanOrEqual(2);
  });
});

describe('GET /v1/search/suggest', () => {
  it('suggests businesses and listings from two characters, up to eight', async () => {
    const owner = await signUpOwner(ctx, refs, { name: 'Bolt House' });
    for (let i = 0; i < 9; i += 1) {
      await createProduct(ctx, owner.session, refs, { title: `Bolt kit ${i}` });
    }
    const serviceId = await createService(ctx, owner.session, refs, { title: 'Bolt fitting' });
    await drainSearch();

    const response = await call(ctx, 'GET', '/v1/search/suggest?q=bo');
    expect(response.statusCode).toBe(200);
    const { data } = response.json<{ data: { type: string; label: string; slug: string }[] }>();
    expect(data).toHaveLength(SEARCH_LIMITS.suggestMax);
    expect(data.every((item) => item.label.startsWith('Bolt'))).toBe(true);

    const typo = await call(ctx, 'GET', '/v1/search/suggest?q=fittng');
    expect(typo.json()).toEqual({
      data: [{ type: 'service', id: serviceId, label: 'Bolt fitting', slug: null }],
    });
    const business = await call(ctx, 'GET', '/v1/search/suggest?q=house');
    expect(business.json()).toEqual({
      data: [
        { type: 'business', id: owner.business.id, label: 'Bolt House', slug: owner.business.slug },
      ],
    });
  });

  it('needs two characters', async () => {
    const response = await call(ctx, 'GET', '/v1/search/suggest?q=b');
    expect(response.statusCode).toBe(400);
  });
});

describe('rate limits', () => {
  it('allows 60 searches per minute per IP, then 429 with Retry-After', async () => {
    const ip = nextIp();
    const hit = (url: string) => ctx.app.inject({ method: 'GET', url, remoteAddress: ip });
    for (let i = 0; i < RATE_LIMITS.search.max; i += 1) {
      expect((await hit('/v1/search?q=x')).statusCode).toBe(200);
    }
    const limited = await hit('/v1/search?q=x');
    expect(limited.statusCode).toBe(429);
    expect(problemCode(limited)).toBe('RATE_LIMITED');
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    // Suggest has its own bucket.
    expect((await hit('/v1/search/suggest?q=xy')).statusCode).toBe(200);
  });
});
