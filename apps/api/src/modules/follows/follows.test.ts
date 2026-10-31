import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type ReferenceData, call, referenceData, signUpOwner } from '../../test/catalog';
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

let owner: MobileSession;
let business: { id: string; slug: string };
let fan: MobileSession;

beforeEach(async () => {
  ({ session: owner, business } = await signUpOwner(ctx, refs));
  fan = await registerMobile(ctx);
});

describe('follows', () => {
  it('rejects guests on every write and on the following list', async () => {
    expect((await call(ctx, 'PUT', `/v1/follows/${business.id}`)).statusCode).toBe(401);
    expect((await call(ctx, 'DELETE', `/v1/follows/${business.id}`)).statusCode).toBe(401);
    expect((await call(ctx, 'GET', '/v1/me/following')).statusCode).toBe(401);
  });

  it('follows idempotently, updates the count and both lists, then unfollows', async () => {
    const url = `/v1/follows/${business.id}`;
    expect((await call(ctx, 'PUT', url, { as: fan })).json()).toEqual({
      isFollowing: true,
      followerCount: 1,
    });
    expect((await call(ctx, 'PUT', url, { as: fan })).json().followerCount).toBe(1);

    const page = await call(ctx, 'GET', `/v1/businesses/${business.slug}`);
    expect(page.json().followerCount).toBe(1);

    const following = await call(ctx, 'GET', '/v1/me/following', { as: fan });
    expect(following.json().data[0].business).toMatchObject({ id: business.id });
    // Each user sees only their own list.
    expect((await call(ctx, 'GET', '/v1/me/following', { as: owner })).json().data).toEqual([]);

    const followers = await call(ctx, 'GET', `/v1/businesses/${business.id}/followers`);
    expect(followers.json().data).toEqual([
      { user: { id: fan.user.id, name: 'Asha Traders' }, followedAt: expect.any(String) },
    ]);

    expect((await call(ctx, 'DELETE', url, { as: fan })).json()).toEqual({
      isFollowing: false,
      followerCount: 0,
    });
    expect((await call(ctx, 'DELETE', url, { as: fan })).json().followerCount).toBe(0);
  });

  it('does not let owners follow their own business', async () => {
    const response = await call(ctx, 'PUT', `/v1/follows/${business.id}`, { as: owner });
    expect(response.statusCode).toBe(400);
  });

  it('404s on unknown or suspended businesses', async () => {
    const missing = '0199f4a0-0000-7000-8000-000000000001';
    expect((await call(ctx, 'PUT', `/v1/follows/${missing}`, { as: fan })).statusCode).toBe(404);
    await prisma.user.update({ where: { id: owner.user.id }, data: { status: 'suspended' } });
    expect((await call(ctx, 'PUT', `/v1/follows/${business.id}`, { as: fan })).statusCode).toBe(
      404,
    );
  });

  it('keeps the follower count equal to the follows table under concurrent follows', async () => {
    const users = await Promise.all(Array.from({ length: 10 }, () => registerMobile(ctx)));
    const url = `/v1/follows/${business.id}`;
    await Promise.all(
      users.flatMap((user) => [1, 2].map(() => call(ctx, 'PUT', url, { as: user }))),
    );
    const row = await prisma.business.findUniqueOrThrow({ where: { id: business.id } });
    expect(row.followerCount).toBe(10);
    expect(await prisma.follow.count({ where: { businessId: business.id } })).toBe(10);
  });
});
