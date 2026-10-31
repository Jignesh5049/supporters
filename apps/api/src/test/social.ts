import type { LightMyRequestResponse } from 'fastify';
import { type ReferenceData, call, signUpOwner } from './catalog';
import { type TestContext, prisma } from './helpers';

/** A ready `post` upload row, inserted directly: a JPEG image or an MP4 video. */
export async function postUpload(userId: string, kind: 'image' | 'video' = 'image') {
  const upload = await prisma.upload.create({
    data: {
      userId,
      purpose: 'post',
      key: `public/post/${crypto.randomUUID()}`,
      contentType: kind === 'video' ? 'video/mp4' : 'image/jpeg',
      sizeBytes: 1_024,
      status: 'ready',
    },
  });
  return upload.id;
}

/** A body that publishes an update post with one fresh image. */
export const publishedPostBody = async (userId: string) => ({
  type: 'update',
  body: 'Fresh stock this week',
  mediaIds: [await postUpload(userId)],
  status: 'published',
});

/**
 * Inserts published posts straight into the database, one minute apart, and
 * returns their ids newest first. `startMinutesAgo` shifts the whole batch back.
 */
export async function seedPosts(businessId: string, count: number, startMinutesAgo = 0) {
  const now = Date.now();
  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const post = await prisma.post.create({
      data: {
        businessId,
        type: 'update',
        body: `Seeded ${i}`,
        status: 'published',
        publishedAt: new Date(now - (startMinutesAgo + i + 1) * 60_000),
      },
      select: { id: true },
    });
    ids.push(post.id);
  }
  return ids;
}

/** The ids of a `{ data, nextCursor }` page, in order. */
export const pageIds = (response: LightMyRequestResponse) =>
  response.json<{ data: { id: string }[] }>().data.map((row) => row.id);

/** A business owner and one published post of theirs, created through the API. */
export async function ownerWithPost(ctx: TestContext, refs: ReferenceData, overrides: object = {}) {
  const owner = await signUpOwner(ctx, refs, overrides);
  const response = await call(ctx, 'POST', '/v1/me/business/posts', {
    as: owner.session,
    body: await publishedPostBody(owner.session.user.id),
  });
  if (response.statusCode !== 201) throw new Error(`create post failed: ${response.body}`);
  return { ...owner, postId: response.json<{ id: string }>().id };
}
