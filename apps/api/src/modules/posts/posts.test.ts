import { PLAN_LIMITS } from '@supporters/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  type ReferenceData,
  call,
  productBody,
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
import { pageIds, postUpload, publishedPostBody, seedPosts } from '../../test/social';

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

const DAY_MS = 24 * 60 * 60 * 1000;

describe('posts: authorization matrix', () => {
  let owner: MobileSession;
  let otherOwner: MobileSession;
  let stranger: MobileSession;
  let postId: string;
  const url = '/v1/me/business/posts';

  beforeEach(async () => {
    ({ session: owner } = await signUpOwner(ctx, refs));
    ({ session: otherOwner } = await signUpOwner(ctx, refs));
    stranger = await registerMobile(ctx);
    const created = await call(ctx, 'POST', url, {
      as: owner,
      body: { type: 'update', body: 'Hello' },
    });
    expect(created.statusCode).toBe(201);
    postId = created.json().id;
  });

  it('rejects guests on every owner route', async () => {
    expect((await call(ctx, 'GET', url)).statusCode).toBe(401);
    expect((await call(ctx, 'POST', url, { body: { type: 'update' } })).statusCode).toBe(401);
    expect((await call(ctx, 'PATCH', `${url}/${postId}`, { body: {} })).statusCode).toBe(401);
    expect((await call(ctx, 'DELETE', `${url}/${postId}`)).statusCode).toBe(401);
  });

  it('asks users without a business to create one first (only business pages post)', async () => {
    const response = await call(ctx, 'POST', url, { as: stranger, body: { type: 'update' } });
    expect(response.statusCode).toBe(403);
    expect(problemCode(response)).toBe('BUSINESS_REQUIRED');
    const patch = await call(ctx, 'PATCH', `${url}/${postId}`, { as: stranger, body: {} });
    expect(patch.statusCode).toBe(403);
  });

  it("hides another business's post from its writes and its list", async () => {
    const patch = await call(ctx, 'PATCH', `${url}/${postId}`, {
      as: otherOwner,
      body: { body: 'Mine now' },
    });
    expect(patch.statusCode).toBe(404);
    expect((await call(ctx, 'DELETE', `${url}/${postId}`, { as: otherOwner })).statusCode).toBe(
      404,
    );
    expect((await call(ctx, 'GET', url, { as: otherOwner })).json().data).toEqual([]);
    expect((await call(ctx, 'GET', url, { as: owner })).json().data[0].body).toBe('Hello');
  });

  it('lets the owner update and delete', async () => {
    const patch = await call(ctx, 'PATCH', `${url}/${postId}`, {
      as: owner,
      body: { body: 'Edited' },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json().body).toBe('Edited');
    expect((await call(ctx, 'DELETE', `${url}/${postId}`, { as: owner })).statusCode).toBe(204);
    expect((await call(ctx, 'DELETE', `${url}/${postId}`, { as: owner })).statusCode).toBe(404);
  });

  it('does not let a user publish with an upload that belongs to someone else', async () => {
    const theirs = await postUpload(stranger.user.id);
    const response = await call(ctx, 'PATCH', `${url}/${postId}`, {
      as: owner,
      body: { mediaIds: [theirs], status: 'published' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().errors[0].path).toBe('body.mediaIds');
  });
});

describe('posts: lifecycle', () => {
  it('creates a draft, publishes it, shows it publicly, then deletes it', async () => {
    const { session, business } = await signUpOwner(ctx, refs);
    const product = await call(ctx, 'POST', '/v1/me/business/products', {
      as: session,
      body: productBody(refs),
    });
    const productId: string = product.json().id;
    const images = [await postUpload(session.user.id), await postUpload(session.user.id)];

    const created = await call(ctx, 'POST', '/v1/me/business/posts', {
      as: session,
      body: { type: 'product', body: 'New stock', productId, mediaIds: images },
    });
    expect(created.statusCode).toBe(201);
    const post = created.json();
    expect(post).toMatchObject({
      type: 'product',
      status: 'draft',
      publishedAt: null,
      likeCount: 0,
      commentCount: 0,
      business: { id: business.id, slug: business.slug },
      // The product is still a draft, so the card stays hidden.
      attachment: null,
    });
    expect(created.json<{ media: { id: string }[] }>().media.map((media) => media.id)).toEqual(
      images,
    );
    expect(post.media[0].kind).toBe('image');

    // Drafts are not public.
    expect((await call(ctx, 'GET', `/v1/posts/${post.id}`)).statusCode).toBe(404);

    await prisma.product.update({ where: { id: productId }, data: { status: 'published' } });
    const published = await call(ctx, 'PATCH', `/v1/me/business/posts/${post.id}`, {
      as: session,
      body: { status: 'published' },
    });
    expect(published.statusCode).toBe(200);
    expect(published.json().publishedAt).not.toBeNull();

    const publicPost = await call(ctx, 'GET', `/v1/posts/${post.id}`);
    expect(publicPost.statusCode).toBe(200);
    expect(publicPost.json().attachment).toMatchObject({
      type: 'product',
      id: productId,
      title: 'M8 steel bolts',
    });
    const tab = await call(ctx, 'GET', `/v1/businesses/${business.id}/posts`);
    expect(pageIds(tab)).toEqual([post.id]);

    await call(ctx, 'DELETE', `/v1/me/business/posts/${post.id}`, { as: session });
    expect((await call(ctx, 'GET', `/v1/posts/${post.id}`)).statusCode).toBe(404);
    expect((await call(ctx, 'GET', `/v1/businesses/${business.id}/posts`)).json().data).toEqual([]);
  });

  it('hides posts of suspended owners', async () => {
    const { session } = await signUpOwner(ctx, refs);
    const created = await call(ctx, 'POST', '/v1/me/business/posts', {
      as: session,
      body: await publishedPostBody(session.user.id),
    });
    await prisma.user.update({ where: { id: session.user.id }, data: { status: 'suspended' } });
    expect((await call(ctx, 'GET', `/v1/posts/${created.json().id}`)).statusCode).toBe(404);
  });

  it('pages a business tab by publish time with an opaque cursor', async () => {
    const { business } = await signUpOwner(ctx, refs);
    const ids = await seedPosts(business.id, 5);
    const url = `/v1/businesses/${business.id}/posts`;
    const first = await call(ctx, 'GET', `${url}?limit=3`);
    expect(pageIds(first)).toEqual(ids.slice(0, 3));
    const cursor: string = first.json().nextCursor;
    const second = await call(ctx, 'GET', `${url}?limit=3&cursor=${cursor}`);
    expect(second.json()).toMatchObject({ nextCursor: null });
    expect(pageIds(second)).toEqual(ids.slice(3));

    expect((await call(ctx, 'GET', `${url}?cursor=nope`)).statusCode).toBe(400);
  });
});

describe('posts: validation', () => {
  let owner: MobileSession;
  beforeEach(async () => {
    ({ session: owner } = await signUpOwner(ctx, refs));
  });

  const create = (body: object) => call(ctx, 'POST', '/v1/me/business/posts', { as: owner, body });

  it('needs an offer tag on offers, and allows it on offers only', async () => {
    expect((await create({ type: 'offer' })).statusCode).toBe(400);
    expect((await create({ type: 'update', offerTag: '20% off' })).statusCode).toBe(400);
    const offer = await create({
      type: 'offer',
      offerTag: '20% off',
      offerEndsAt: new Date(Date.now() + DAY_MS).toISOString(),
    });
    expect(offer.statusCode).toBe(201);
    expect(offer.json().offerTag).toBe('20% off');

    const past = await create({
      type: 'offer',
      offerTag: '20% off',
      offerEndsAt: new Date(Date.now() - DAY_MS).toISOString(),
    });
    expect(past.json().errors[0].path).toBe('body.offerEndsAt');

    const cleared = await call(ctx, 'PATCH', `/v1/me/business/posts/${offer.json().id}`, {
      as: owner,
      body: { offerTag: null },
    });
    expect(cleared.json().errors[0].path).toBe('body.offerTag');
  });

  it('caps the text at 2,200 characters', async () => {
    expect((await create({ type: 'update', body: 'a'.repeat(2_200) })).statusCode).toBe(201);
    expect((await create({ type: 'update', body: 'a'.repeat(2_201) })).statusCode).toBe(400);
  });

  it('takes 1 to 10 images or one video, never both', async () => {
    const video = await postUpload(owner.user.id, 'video');
    const image = await postUpload(owner.user.id);
    const mixed = await create({ type: 'update', mediaIds: [image, video] });
    expect(mixed.statusCode).toBe(400);
    const videoPost = await create({ type: 'update', mediaIds: [video], status: 'published' });
    expect(videoPost.statusCode).toBe(201);
    expect(videoPost.json().media[0].kind).toBe('video');

    const eleven = await Promise.all(Array.from({ length: 11 }, () => postUpload(owner.user.id)));
    expect((await create({ type: 'update', mediaIds: eleven })).statusCode).toBe(400);
  });

  it('needs media to publish', async () => {
    const response = await create({ type: 'update', body: 'Text only', status: 'published' });
    expect(response.statusCode).toBe(400);
    expect(response.json().errors[0].path).toBe('body.mediaIds');
  });

  it('refuses a file already used by another post', async () => {
    const image = await postUpload(owner.user.id);
    expect((await create({ type: 'update', mediaIds: [image] })).statusCode).toBe(201);
    expect((await create({ type: 'update', mediaIds: [image] })).statusCode).toBe(400);
  });

  it('only attaches a listing of the same business, of the matching kind', async () => {
    const other = await signUpOwner(ctx, refs);
    const theirs = await call(ctx, 'POST', '/v1/me/business/products', {
      as: other.session,
      body: productBody(refs),
    });
    const foreign = await create({ type: 'product', productId: theirs.json().id });
    expect(foreign.json().errors[0].path).toBe('body.productId');

    const service = await call(ctx, 'POST', '/v1/me/business/services', {
      as: owner,
      body: serviceBody(refs),
    });
    const wrongKind = await create({ type: 'product', serviceId: service.json().id });
    expect(wrongKind.statusCode).toBe(400);
    expect((await create({ type: 'service', serviceId: service.json().id })).statusCode).toBe(201);
  });

  it('rejects unknown keys, so counters cannot be mass-assigned', async () => {
    expect((await create({ type: 'update', likeCount: 1_000 })).statusCode).toBe(400);
  });
});

describe('posts: free plan limit', () => {
  const limit = PLAN_LIMITS.free.postsPer7Days;

  it(`allows ${limit} publishes per 7 days, counting deleted posts`, async () => {
    const { session, business } = await signUpOwner(ctx, refs);
    const seeded = await seedPosts(business.id, limit);
    const [newest, oldest] = [seeded[0] ?? '', seeded.at(-1) ?? ''];
    await prisma.post.update({ where: { id: newest }, data: { deletedAt: new Date() } });

    const blocked = await call(ctx, 'POST', '/v1/me/business/posts', {
      as: session,
      body: await publishedPostBody(session.user.id),
    });
    expect(blocked.statusCode).toBe(409);
    expect(problemCode(blocked)).toBe('POST_LIMIT_REACHED');

    // Drafts are still allowed.
    const draft = await call(ctx, 'POST', '/v1/me/business/posts', {
      as: session,
      body: { type: 'update', body: 'Later' },
    });
    expect(draft.statusCode).toBe(201);

    // Once the oldest publish is more than 7 days old, a slot frees up.
    await prisma.post.update({
      where: { id: oldest },
      data: { publishedAt: new Date(Date.now() - 8 * DAY_MS) },
    });
    const allowed = await call(ctx, 'POST', '/v1/me/business/posts', {
      as: session,
      body: await publishedPostBody(session.user.id),
    });
    expect(allowed.statusCode).toBe(201);
  });

  it('does not count unarchiving against the limit', async () => {
    const { session, business } = await signUpOwner(ctx, refs);
    const [first = ''] = await seedPosts(business.id, limit);
    await prisma.post.update({ where: { id: first }, data: { status: 'archived' } });
    const response = await call(ctx, 'PATCH', `/v1/me/business/posts/${first}`, {
      as: session,
      body: { status: 'published', mediaIds: [await postUpload(session.user.id)] },
    });
    expect(response.statusCode).toBe(200);
  });

  it('lets only one of several concurrent publishes take the last slot', async () => {
    const { session, business } = await signUpOwner(ctx, refs);
    await seedPosts(business.id, limit - 1);
    const bodies = await Promise.all(
      Array.from({ length: 4 }, () => publishedPostBody(session.user.id)),
    );
    const responses = await Promise.all(
      bodies.map((body) => call(ctx, 'POST', '/v1/me/business/posts', { as: session, body })),
    );
    const statuses = responses.map((response) => response.statusCode).sort();
    expect(statuses).toEqual([201, 409, 409, 409]);
  });

  it('has no limit on Premium', async () => {
    const { session, business } = await signUpOwner(ctx, refs);
    await prisma.business.update({
      where: { id: business.id },
      data: { premiumUntil: new Date(Date.now() + 30 * DAY_MS) },
    });
    await seedPosts(business.id, limit);
    const response = await call(ctx, 'POST', '/v1/me/business/posts', {
      as: session,
      body: await publishedPostBody(session.user.id),
    });
    expect(response.statusCode).toBe(201);
  });
});
