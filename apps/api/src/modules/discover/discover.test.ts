import { randomUUID } from 'node:crypto';
import { SEARCH_LIMITS } from '@supporters/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type ReferenceData, call, referenceData, signUpOwner } from '../../test/catalog';
import { postWithKey, publishedProduct } from '../../test/chat';
import {
  type MobileSession,
  type TestContext,
  createTestApp,
  prisma,
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

interface Discover {
  trending: { id: string }[];
  featured: { id: string; kind: string }[];
  nearYou: { city: { id: string } | null; data: { id: string }[] };
  suggested: { id: string }[];
}

const discover = async (as?: MobileSession, query = '') => {
  const response = await call(ctx, 'GET', `/v1/discover${query}`, as ? { as } : {});
  expect(response.statusCode, response.body).toBe(200);
  return response.json<Discover>();
};
const ids = (rows: { id: string }[]) => rows.map((row) => row.id);

const follow = (as: MobileSession, businessId: string) =>
  call(ctx, 'PUT', `/v1/follows/${businessId}`, { as });

describe('GET /v1/discover', () => {
  it('ranks Trending by new followers plus enquiries in the last 7 days', async () => {
    const quiet = await signUpOwner(ctx, refs, { name: 'Quiet Co' });
    const popular = await signUpOwner(ctx, refs, { name: 'Popular Co' });
    const rising = await signUpOwner(ctx, refs, { name: 'Rising Co' });
    const stale = await signUpOwner(ctx, refs, { name: 'Stale Co' });
    const fans = await Promise.all([1, 2, 3].map(() => registerMobile(ctx)));
    const [a, b, c] = fans as [MobileSession, MobileSession, MobileSession];

    await follow(a, popular.business.id);
    await follow(b, popular.business.id);
    await follow(a, rising.business.id);
    // Enquiries count too: one follow plus two enquiries beats two follows.
    const productId = await publishedProduct(rising.business.id, refs);
    const message = 'We need 500 units delivered to Pune next month.';
    for (const buyer of [b, c]) {
      const enquiry = await postWithKey(ctx, buyer, '/v1/enquiries', { productId, message });
      expect(enquiry.statusCode, enquiry.body).toBe(201);
    }
    // A follow from 8 days ago is out of the window.
    await follow(c, stale.business.id);
    await prisma.follow.updateMany({
      where: { businessId: stale.business.id },
      data: { createdAt: new Date(Date.now() - 8 * 24 * 3600_000) },
    });

    const result = await discover();
    expect(ids(result.trending)).toEqual([rising.business.id, popular.business.id]);
    expect(ids(result.trending)).not.toContain(quiet.business.id);
    // A suspended owner drops out.
    await prisma.user.update({
      where: { id: rising.session.user.id },
      data: { status: 'suspended' },
    });
    expect(ids((await discover()).trending)).toEqual([popular.business.id]);
  });

  it('shows Premium listings in Featured, and nothing without Premium', async () => {
    const owner = await signUpOwner(ctx, refs);
    const productId = await publishedProduct(owner.business.id, refs, 'Premium bolts');
    expect((await discover()).featured).toEqual([]);

    await prisma.business.update({
      where: { id: owner.business.id },
      data: { premiumUntil: new Date(Date.now() + 24 * 3600_000) },
    });
    expect((await discover()).featured).toEqual([
      expect.objectContaining({ id: productId, kind: 'product', title: 'Premium bolts' }),
    ]);

    await prisma.business.update({
      where: { id: owner.business.id },
      data: { premiumUntil: new Date(Date.now() - 1_000) },
    });
    expect((await discover()).featured).toEqual([]);
  });

  it("shows Near you for the guest's chosen city or the user's own, without their own business", async () => {
    const mumbai = await signUpOwner(ctx, refs, { name: 'Mumbai Co' });
    const pune = await signUpOwner(ctx, refs, { name: 'Pune Co', cityId: refs.pune.id });

    const guest = await discover(undefined, `?city=${refs.pune.id}`);
    expect(guest.nearYou.city?.id).toBe(refs.pune.id);
    expect(ids(guest.nearYou.data)).toEqual([pune.business.id]);
    expect(await discover()).toMatchObject({ nearYou: { city: null, data: [] }, suggested: [] });
    expect((await discover(undefined, `?city=${randomUUID()}`)).nearYou).toEqual({
      city: null,
      data: [],
    });

    await prisma.user.update({
      where: { id: pune.session.user.id },
      data: { cityId: refs.mumbai.id },
    });
    const own = await discover(pune.session);
    expect(own.nearYou.city?.id).toBe(refs.mumbai.id);
    expect(ids(own.nearYou.data)).toEqual([mumbai.business.id]);
    // Their own business is left out everywhere.
    const self = await discover(mumbai.session, `?city=${refs.mumbai.id}`);
    expect(ids(self.nearYou.data)).toEqual([]);
  });

  it('suggests businesses in the interest categories that the user does not follow', async () => {
    const inCategory = await signUpOwner(ctx, refs, { name: 'Bolts Co' });
    const inSubcategory = await signUpOwner(ctx, refs, {
      name: 'Nuts Co',
      categoryId: refs.otherCategory.id,
      subcategoryId: undefined,
    });
    const followed = await signUpOwner(ctx, refs, { name: 'Followed Co' });
    await signUpOwner(ctx, refs, { name: 'Elsewhere Co', categoryId: refs.otherCategory.id });
    const user = await registerMobile(ctx);
    await prisma.userInterest.create({
      data: { userId: user.user.id, categoryId: refs.category.id },
    });
    await follow(user, followed.business.id);

    const result = await discover(user);
    expect(ids(result.suggested).sort()).toEqual([inCategory.business.id].sort());
    expect(ids(result.suggested)).not.toContain(inSubcategory.business.id);

    // A subcategory interest matches businesses filed under that subcategory.
    await prisma.business.update({
      where: { id: inSubcategory.business.id },
      data: { categoryId: refs.category.id, subcategoryId: refs.subcategory.id },
    });
    await prisma.userInterest.deleteMany({ where: { userId: user.user.id } });
    await prisma.userInterest.create({
      data: { userId: user.user.id, categoryId: refs.subcategory.id },
    });
    expect(ids((await discover(user)).suggested)).toEqual([inSubcategory.business.id]);
  });

  it(`caps every section at ${SEARCH_LIMITS.discoverSectionSize}`, async () => {
    const owners = [];
    for (let i = 0; i <= SEARCH_LIMITS.discoverSectionSize; i += 1) {
      owners.push(await signUpOwner(ctx, refs, { name: `Shop ${i}` }));
    }
    const result = await discover(undefined, `?city=${refs.mumbai.id}`);
    expect(result.nearYou.data).toHaveLength(SEARCH_LIMITS.discoverSectionSize);
    expect(owners).toHaveLength(SEARCH_LIMITS.discoverSectionSize + 1);
  });

  it('rejects unknown params', async () => {
    const response = await call(ctx, 'GET', '/v1/discover?city=nope');
    expect(response.statusCode).toBe(400);
    expect((await call(ctx, 'GET', '/v1/discover?sort=x')).statusCode).toBe(400);
  });
});
