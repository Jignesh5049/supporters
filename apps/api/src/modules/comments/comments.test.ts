import { RATE_LIMITS } from '@supporters/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type ReferenceData, call, referenceData } from '../../test/catalog';
import {
  type MobileSession,
  type TestContext,
  createTestApp,
  prisma,
  problemCode,
  registerMobile,
  resetState,
} from '../../test/helpers';
import { ownerWithPost, pageIds } from '../../test/social';

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
let author: MobileSession;
let stranger: MobileSession;
let postId: string;

beforeEach(async () => {
  ({ session: owner, postId } = await ownerWithPost(ctx, refs));
  author = await registerMobile(ctx);
  stranger = await registerMobile(ctx);
});

const comment = (as: MobileSession, body: object, id = postId) =>
  call(ctx, 'POST', `/v1/posts/${id}/comments`, { as, body });
const commentCount = async () =>
  (await prisma.post.findUniqueOrThrow({ where: { id: postId } })).commentCount;

describe('comments: authorization matrix', () => {
  it('lets guests read but not write', async () => {
    await comment(author, { body: 'Nice' });
    const list = await call(ctx, 'GET', `/v1/posts/${postId}/comments`);
    expect(list.statusCode).toBe(200);
    expect(list.json().data[0]).toMatchObject({ body: 'Nice', author: { id: author.user.id } });
    const write = await call(ctx, 'POST', `/v1/posts/${postId}/comments`, { body: { body: 'x' } });
    expect(write.statusCode).toBe(401);
  });

  it('lets the author or the post owner delete, and nobody else', async () => {
    const first = (await comment(author, { body: 'One' })).json<{ id: string }>().id;
    const second = (await comment(author, { body: 'Two' })).json<{ id: string }>().id;

    expect((await call(ctx, 'DELETE', `/v1/comments/${first}`)).statusCode).toBe(401);
    const denied = await call(ctx, 'DELETE', `/v1/comments/${first}`, { as: stranger });
    expect(denied.statusCode).toBe(403);
    expect(problemCode(denied)).toBe('FORBIDDEN');

    expect((await call(ctx, 'DELETE', `/v1/comments/${first}`, { as: author })).statusCode).toBe(
      204,
    );
    expect((await call(ctx, 'DELETE', `/v1/comments/${second}`, { as: owner })).statusCode).toBe(
      204,
    );
    expect((await call(ctx, 'DELETE', `/v1/comments/${second}`, { as: owner })).statusCode).toBe(
      404,
    );
    expect(await commentCount()).toBe(0);
  });

  it('marks comments written by the post owner', async () => {
    const response = await comment(owner, { body: 'Thanks!' });
    expect(response.json().isByBusiness).toBe(true);
    expect((await comment(author, { body: 'Hi' })).json().isByBusiness).toBe(false);
  });

  it('404s on posts that are not public', async () => {
    await prisma.post.update({ where: { id: postId }, data: { deletedAt: new Date() } });
    expect((await comment(author, { body: 'Hello?' })).statusCode).toBe(404);
    expect((await call(ctx, 'GET', `/v1/posts/${postId}/comments`)).statusCode).toBe(404);
  });
});

describe('comments: replies', () => {
  it('allows one level of replies and rejects a reply to a reply', async () => {
    const top = (await comment(author, { body: 'Price?' })).json<{ id: string }>().id;
    const reply = await comment(owner, { body: 'DM us', parentId: top });
    expect(reply.statusCode).toBe(201);
    expect(reply.json().parentId).toBe(top);

    const nested = await comment(author, { body: 'Done', parentId: reply.json().id });
    expect(nested.statusCode).toBe(400);
    expect(nested.json().errors[0]).toMatchObject({
      path: 'body.parentId',
      message: 'Replies cannot have replies',
    });

    const topLevel = await call(ctx, 'GET', `/v1/posts/${postId}/comments`);
    expect(pageIds(topLevel)).toEqual([top]);
    expect(topLevel.json().data[0].replyCount).toBe(1);
    const replies = await call(ctx, 'GET', `/v1/posts/${postId}/comments?parentId=${top}`);
    expect(pageIds(replies)).toEqual([reply.json().id]);
    expect(await commentCount()).toBe(2);
  });

  it('refuses a parent from another post', async () => {
    const other = await ownerWithPost(ctx, refs);
    const elsewhere = (await comment(author, { body: 'Hi' }, other.postId)).json<{ id: string }>();
    const response = await comment(author, { body: 'Hi', parentId: elsewhere.id });
    expect(response.statusCode).toBe(400);
  });

  it('deletes replies with their parent and keeps the counters right', async () => {
    const top = (await comment(author, { body: 'Q' })).json<{ id: string }>().id;
    const replyA = (await comment(owner, { body: 'A', parentId: top })).json<{ id: string }>().id;
    await comment(stranger, { body: 'B', parentId: top });
    expect(await commentCount()).toBe(3);

    await call(ctx, 'DELETE', `/v1/comments/${replyA}`, { as: owner });
    expect(await commentCount()).toBe(2);
    const parent = await prisma.comment.findUniqueOrThrow({ where: { id: top } });
    expect(parent.replyCount).toBe(1);

    await call(ctx, 'DELETE', `/v1/comments/${top}`, { as: author });
    expect(await commentCount()).toBe(0);
    expect(await prisma.comment.count({ where: { postId, deletedAt: null } })).toBe(0);
  });
});

describe('comments: validation and limits', () => {
  it('caps the text at 1,000 characters and rejects empty comments', async () => {
    expect((await comment(author, { body: 'a'.repeat(1_000) })).statusCode).toBe(201);
    expect((await comment(author, { body: 'a'.repeat(1_001) })).statusCode).toBe(400);
    expect((await comment(author, { body: '   ' })).statusCode).toBe(400);
  });

  it(`allows ${RATE_LIMITS.commentsPerHour} comments per hour per user`, async () => {
    for (let i = 0; i < RATE_LIMITS.commentsPerHour; i += 1) {
      expect((await comment(author, { body: `#${i}` })).statusCode).toBe(201);
    }
    const limited = await comment(author, { body: 'One more' });
    expect(limited.statusCode).toBe(429);
    expect(problemCode(limited)).toBe('RATE_LIMITED');
  });
});
