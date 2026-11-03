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
import { pageIds, seedPosts } from '../../test/social';

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

interface FeedPage {
  data: { id: string; source: string }[];
  nextCursor: string | null;
}

/** Walks every page of a feed URL and returns the items in order. */
async function readAll(url: string, as?: MobileSession, limit = 2) {
  const items: FeedPage['data'] = [];
  let cursor: string | null = null;
  do {
    const query: string = `limit=${limit}${cursor ? `&cursor=${cursor}` : ''}`;
    const response = await call(ctx, 'GET', `${url}${url.includes('?') ? '&' : '?'}${query}`, {
      ...(as ? { as } : {}),
    });
    expect(response.statusCode).toBe(200);
    const page = response.json<FeedPage>();
    items.push(...page.data);
    cursor = page.nextCursor;
  } while (cursor);
  return items;
}

/**
 * A viewer in Mumbai interested in `refs.category`, and posts from: a followed
 * business in Pune (other category, oldest posts), a Mumbai business, a Pune
 * business (same state), a Mumbai business outside the interests, and a
 * Gujarat business. City posts are newer than followed ones on purpose.
 */
async function world() {
  const gujaratCity = await prisma.city.findFirstOrThrow({ where: { stateId: refs.gujarat.id } });
  const make = async (cityId: string, categoryId: string) =>
    (await signUpOwner(ctx, refs, { cityId, categoryId })).business.id;
  const followed = await make(refs.pune.id, refs.otherCategory.id);
  const city = await make(refs.mumbai.id, refs.category.id);
  const state = await make(refs.pune.id, refs.category.id);
  const offInterest = await make(refs.mumbai.id, refs.otherCategory.id);
  const otherState = await make(gujaratCity.id, refs.category.id);

  const posts = {
    followed: await seedPosts(followed, 2, 100),
    city: await seedPosts(city, 2, 0),
    state: await seedPosts(state, 2, 10),
    offInterest: await seedPosts(offInterest, 1, 5),
    otherState: await seedPosts(otherState, 1, 5),
  };

  const viewer = await registerMobile(ctx);
  await prisma.user.update({ where: { id: viewer.user.id }, data: { cityId: refs.mumbai.id } });
  await prisma.userInterest.create({
    data: { userId: viewer.user.id, categoryId: refs.category.id },
  });
  await call(ctx, 'PUT', `/v1/follows/${followed}`, { as: viewer });
  return { viewer, posts };
}

describe('feed: signed in', () => {
  it('shows followed businesses first, then city, then state, in the interest categories', async () => {
    const { viewer, posts } = await world();
    const items = await readAll('/v1/feed', viewer);
    expect(items.map((item) => item.id)).toEqual([
      ...posts.followed,
      ...posts.city,
      ...posts.state,
    ]);
    expect(items.map((item) => item.source)).toEqual([
      'following',
      'following',
      'city',
      'city',
      'state',
      'state',
    ]);
  });

  it('gives the same order in one page as across many small ones', async () => {
    const { viewer } = await world();
    const onePage = await call(ctx, 'GET', '/v1/feed', { as: viewer });
    expect(onePage.json<FeedPage>().nextCursor).toBeNull();
    expect((await readAll('/v1/feed', viewer, 1)).map((item) => item.id)).toEqual(pageIds(onePage));
  });

  it('skips seen posts in the city and state fill', async () => {
    const { viewer, posts } = await world();
    const [seenCity = ''] = posts.city;
    const seen = await call(ctx, 'POST', '/v1/feed/seen', {
      as: viewer,
      body: { postIds: [seenCity, ...posts.followed] },
    });
    expect(seen.statusCode).toBe(204);
    const ids = pageIds(await call(ctx, 'GET', '/v1/feed', { as: viewer }));
    expect(ids).not.toContain(seenCity);
    // Followed businesses' posts stay in the feed.
    expect(ids.slice(0, 2)).toEqual(posts.followed);
  });

  it('falls back to All India in the interest categories without a city', async () => {
    const { viewer, posts } = await world();
    await prisma.user.update({ where: { id: viewer.user.id }, data: { cityId: null } });
    const items = await readAll('/v1/feed', viewer);
    expect(items.slice(0, 2).map((item) => item.source)).toEqual(['following', 'following']);
    expect(new Set(items.slice(2).map((item) => item.id))).toEqual(
      new Set([...posts.city, ...posts.state, ...posts.otherState]),
    );
    expect(new Set(items.slice(2).map((item) => item.source))).toEqual(new Set(['all_india']));
  });

  it('rejects a tampered cursor and needs sign-in to mark posts seen', async () => {
    const { viewer } = await world();
    expect((await call(ctx, 'GET', '/v1/feed?cursor=abc', { as: viewer })).statusCode).toBe(400);
    const forged = Buffer.from(
      JSON.stringify({ s: 9, t: new Date().toISOString(), i: viewer.user.id }),
    ).toString('base64url');
    expect((await call(ctx, 'GET', `/v1/feed?cursor=${forged}`, { as: viewer })).statusCode).toBe(
      400,
    );
    const guest = await call(ctx, 'POST', '/v1/feed/seen', {
      body: { postIds: [viewer.user.id] },
    });
    expect(guest.statusCode).toBe(401);
  });
});

describe('feed: guest', () => {
  it('shows the newest posts in the chosen city', async () => {
    const { posts } = await world();
    const items = await readAll(`/v1/feed?city=${refs.mumbai.id}`);
    // Mumbai posts across all categories, newest first.
    expect(items.map((item) => item.id)).toEqual([...posts.city, ...posts.offInterest]);
    expect(new Set(items.map((item) => item.source))).toEqual(new Set(['city']));
  });

  it('defaults to All India, newest first', async () => {
    const { posts } = await world();
    const items = await readAll('/v1/feed', undefined, 3);
    expect(items).toHaveLength(8);
    expect(items.slice(0, 2).map((item) => item.id)).toEqual(posts.city);
    expect(items.slice(-2).map((item) => item.id)).toEqual(posts.followed);
  });

  it('rejects an unknown city', async () => {
    const response = await call(ctx, 'GET', '/v1/feed?city=0199f4a0-0000-7000-8000-000000000001');
    expect(response.statusCode).toBe(400);
  });

  it('hides drafts, deleted posts and suspended owners', async () => {
    const owner = await signUpOwner(ctx, refs);
    const [draft = '', deleted = '', live = ''] = await seedPosts(owner.business.id, 3);
    await prisma.post.update({ where: { id: draft }, data: { status: 'draft' } });
    await prisma.post.update({ where: { id: deleted }, data: { deletedAt: new Date() } });
    expect(pageIds(await call(ctx, 'GET', '/v1/feed'))).toEqual([live]);
    await prisma.user.update({
      where: { id: owner.session.user.id },
      data: { status: 'suspended' },
    });
    expect(pageIds(await call(ctx, 'GET', '/v1/feed'))).toEqual([]);
  });
});
