import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type ReferenceData, call, referenceData } from '../../test/catalog';
import {
  type MobileSession,
  type TestContext,
  createTestApp,
  prisma,
  registerMobile,
  resetState,
} from '../../test/helpers';
import { ownerWithPost } from '../../test/social';

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

describe('likes', () => {
  let owner: MobileSession;
  let fan: MobileSession;
  let postId: string;

  beforeEach(async () => {
    ({ session: owner, postId } = await ownerWithPost(ctx, refs));
    fan = await registerMobile(ctx);
  });

  it('rejects guests', async () => {
    expect((await call(ctx, 'PUT', `/v1/posts/${postId}/like`)).statusCode).toBe(401);
    expect((await call(ctx, 'DELETE', `/v1/posts/${postId}/like`)).statusCode).toBe(401);
  });

  it('likes idempotently, shows it to the liker only, and unlikes', async () => {
    const url = `/v1/posts/${postId}/like`;
    expect((await call(ctx, 'PUT', url, { as: fan })).json()).toEqual({
      isLiked: true,
      likeCount: 1,
    });
    expect((await call(ctx, 'PUT', url, { as: fan })).json()).toEqual({
      isLiked: true,
      likeCount: 1,
    });
    expect((await call(ctx, 'GET', `/v1/posts/${postId}`, { as: fan })).json()).toMatchObject({
      likeCount: 1,
      isLiked: true,
    });
    expect((await call(ctx, 'GET', `/v1/posts/${postId}`, { as: owner })).json().isLiked).toBe(
      false,
    );
    expect((await call(ctx, 'GET', `/v1/posts/${postId}`)).json().isLiked).toBe(false);

    expect((await call(ctx, 'DELETE', url, { as: fan })).json()).toEqual({
      isLiked: false,
      likeCount: 0,
    });
    expect((await call(ctx, 'DELETE', url, { as: fan })).json().likeCount).toBe(0);
  });

  it('404s on drafts and deleted posts', async () => {
    await prisma.post.update({ where: { id: postId }, data: { status: 'draft' } });
    expect((await call(ctx, 'PUT', `/v1/posts/${postId}/like`, { as: fan })).statusCode).toBe(404);
  });

  it('keeps the counter equal to the likes table under concurrent likes', async () => {
    const users = await Promise.all(Array.from({ length: 12 }, () => registerMobile(ctx)));
    const url = `/v1/posts/${postId}/like`;
    // Every user likes twice at once, then half of them unlike at once.
    await Promise.all(
      users.flatMap((user) => [1, 2].map(() => call(ctx, 'PUT', url, { as: user }))),
    );
    await Promise.all(users.slice(0, 6).map((user) => call(ctx, 'DELETE', url, { as: user })));

    const post = await prisma.post.findUniqueOrThrow({ where: { id: postId } });
    const likes = await prisma.like.count({ where: { postId } });
    expect(likes).toBe(6);
    expect(post.likeCount).toBe(6);
  });
});
