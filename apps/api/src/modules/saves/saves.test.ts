import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  type ReferenceData,
  call,
  productBody,
  readyUpload,
  referenceData,
} from '../../test/catalog';
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

let owner: MobileSession;
let businessId: string;
let postId: string;
let productId: string;
let user: MobileSession;

beforeEach(async () => {
  ({
    session: owner,
    business: { id: businessId },
    postId,
  } = await ownerWithPost(ctx, refs));
  const product = await call(ctx, 'POST', '/v1/me/business/products', {
    as: owner,
    body: productBody(refs, { status: 'published', mediaIds: [await readyUpload(owner.user.id)] }),
  });
  productId = product.json<{ id: string }>().id;
  user = await registerMobile(ctx);
});

describe('saves', () => {
  it('rejects guests on every route', async () => {
    expect((await call(ctx, 'PUT', `/v1/saves/post/${postId}`)).statusCode).toBe(401);
    expect((await call(ctx, 'DELETE', `/v1/saves/post/${postId}`)).statusCode).toBe(401);
    expect((await call(ctx, 'GET', '/v1/me/saves')).statusCode).toBe(401);
  });

  it('saves posts, products and businesses into one list with type tabs', async () => {
    for (const [type, id] of [
      ['post', postId],
      ['product', productId],
      ['business', businessId],
    ]) {
      const response = await call(ctx, 'PUT', `/v1/saves/${type}/${id}`, { as: user });
      expect(response.json()).toEqual({ isSaved: true });
    }
    // Saving again changes nothing.
    await call(ctx, 'PUT', `/v1/saves/post/${postId}`, { as: user });

    const all = await call(ctx, 'GET', '/v1/me/saves', { as: user });
    expect(all.json<{ data: { type: string }[] }>().data.map((item) => item.type)).toEqual([
      'business',
      'product',
      'post',
    ]);
    expect(all.json().data[2].post).toMatchObject({ id: postId, isSaved: true, saveCount: 1 });

    const products = await call(ctx, 'GET', '/v1/me/saves?type=product', { as: user });
    expect(products.json().data).toHaveLength(1);
    expect(products.json().data[0].product.id).toBe(productId);

    // Other users see their own (empty) list.
    expect((await call(ctx, 'GET', '/v1/me/saves', { as: owner })).json().data).toEqual([]);
  });

  it('unsaves and keeps the post counter in step', async () => {
    await call(ctx, 'PUT', `/v1/saves/post/${postId}`, { as: user });
    await call(ctx, 'PUT', `/v1/saves/post/${postId}`, { as: owner });
    expect((await call(ctx, 'DELETE', `/v1/saves/post/${postId}`, { as: user })).json()).toEqual({
      isSaved: false,
    });
    await call(ctx, 'DELETE', `/v1/saves/post/${postId}`, { as: user });
    const post = await prisma.post.findUniqueOrThrow({ where: { id: postId } });
    expect(post.saveCount).toBe(1);
  });

  it('refuses unknown or non-public targets, and hides saves whose target went away', async () => {
    const missing = '0199f4a0-0000-7000-8000-000000000001';
    expect((await call(ctx, 'PUT', `/v1/saves/service/${missing}`, { as: user })).statusCode).toBe(
      404,
    );
    expect((await call(ctx, 'PUT', `/v1/saves/review/${postId}`, { as: user })).statusCode).toBe(
      400,
    );

    await call(ctx, 'PUT', `/v1/saves/post/${postId}`, { as: user });
    await prisma.post.update({ where: { id: postId }, data: { status: 'archived' } });
    expect((await call(ctx, 'GET', '/v1/me/saves', { as: user })).json().data).toEqual([]);
    // A dead bookmark can still be removed.
    expect((await call(ctx, 'DELETE', `/v1/saves/post/${postId}`, { as: user })).statusCode).toBe(
      200,
    );
  });
});
