import { GetObjectCommand, HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { MEDIA_LIMITS, RATE_LIMITS } from '@supporters/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  type ReferenceData,
  call,
  productBody,
  readyUpload,
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
import { PDF, jpeg, runMediaJobs } from '../../test/media';
import { MINIO_CREDENTIALS, TEST_BUCKET } from '../../test/minio';

let ctx: TestContext;
let refs: ReferenceData;
let s3: S3Client;

beforeAll(async () => {
  ctx = await createTestApp();
  refs = await referenceData();
  JPEG = await jpeg();
  s3 = new S3Client({
    region: ctx.env.S3_REGION,
    endpoint: ctx.env.S3_ENDPOINT ?? '',
    forcePathStyle: true,
    credentials: MINIO_CREDENTIALS,
  });
});
afterAll(async () => {
  s3.destroy();
  await ctx.app.close();
});
beforeEach(resetState);

let JPEG: Buffer;

const presign = (as: MobileSession | undefined, body: object) =>
  call(ctx, 'POST', '/v1/uploads/presign', { ...(as ? { as } : {}), body });

const complete = (as: MobileSession | undefined, id: string) =>
  call(ctx, 'POST', `/v1/uploads/${id}/complete`, as ? { as } : {});

interface Presigned {
  id: string;
  url: string;
  headers: Record<string, string>;
  expiresAt: string;
}

/** Presigns, PUTs `file` to MinIO as the client would, and returns the presign response. */
async function putFile(
  as: MobileSession,
  purpose: string,
  contentType: string,
  file: Buffer,
): Promise<Presigned> {
  const response = await presign(as, { purpose, contentType, size: file.length });
  expect(response.statusCode, response.body).toBe(201);
  const presigned = response.json<Presigned>();
  const put = await fetch(presigned.url, {
    method: 'PUT',
    headers: presigned.headers,
    body: new Uint8Array(file),
  });
  expect(put.status).toBe(200);
  return presigned;
}

describe('POST /v1/uploads/presign', () => {
  it('rejects guests', async () => {
    const response = await presign(undefined, {
      purpose: 'listing',
      contentType: 'image/jpeg',
      size: 100,
    });
    expect(response.statusCode).toBe(401);
  });

  it('returns a 5-minute PUT URL under the purpose prefix', async () => {
    const session = await registerMobile(ctx);
    const response = await presign(session, {
      purpose: 'listing',
      contentType: 'image/webp',
      size: 2_048,
    });
    expect(response.statusCode).toBe(201);
    const body = response.json<Presigned & { method: string }>();
    expect(body).toMatchObject({ method: 'PUT', headers: { 'content-type': 'image/webp' } });
    expect(new URL(body.url).pathname).toMatch(/^\/supporters-media-test\/public\/listing\//);
    const ttlMs = new Date(body.expiresAt).getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan((MEDIA_LIMITS.presignTtlSec - 30) * 1000);
    expect(ttlMs).toBeLessThanOrEqual(MEDIA_LIMITS.presignTtlSec * 1000);

    const chat = await presign(session, {
      purpose: 'chat',
      contentType: 'application/pdf',
      size: 100,
    });
    expect(new URL(chat.json<Presigned>().url).pathname).toMatch(
      /^\/supporters-media-test\/chat\//,
    );
  });

  it('rejects types and sizes the purpose does not allow', async () => {
    const session = await registerMobile(ctx);
    const cases = [
      { purpose: 'listing', contentType: 'image/svg+xml', size: 100 },
      { purpose: 'listing', contentType: 'image/gif', size: 100 },
      { purpose: 'listing', contentType: 'application/pdf', size: 100 },
      { purpose: 'listing', contentType: 'video/mp4', size: 100 },
      { purpose: 'avatar', contentType: 'image/jpeg', size: MEDIA_LIMITS.imageMaxBytes + 1 },
      { purpose: 'post', contentType: 'video/mp4', size: MEDIA_LIMITS.videoMaxBytes + 1 },
      { purpose: 'kyc', contentType: 'image/webp', size: 100 },
      { purpose: 'listing', contentType: 'image/jpeg', size: 0 },
      { purpose: 'logo', contentType: 'image/jpeg', size: 100 },
    ];
    for (const body of cases) {
      const response = await presign(session, body);
      expect(response.statusCode, JSON.stringify(body)).toBe(400);
      expect(problemCode(response)).toBe('VALIDATION_FAILED');
    }
    const allowed = [
      { purpose: 'post', contentType: 'video/mp4', size: MEDIA_LIMITS.videoMaxBytes },
      { purpose: 'kyc', contentType: 'image/png', size: 100 },
      { purpose: 'chat', contentType: 'application/pdf', size: MEDIA_LIMITS.documentMaxBytes },
    ];
    for (const body of allowed) {
      expect((await presign(session, body)).statusCode, JSON.stringify(body)).toBe(201);
    }
  });

  it('limits presigns per user per hour', async () => {
    const session = await registerMobile(ctx);
    const body = { purpose: 'listing', contentType: 'image/jpeg', size: 100 };
    for (let i = 0; i < RATE_LIMITS.uploadPresignsPerHour; i += 1) {
      await ctx.app.limiter.hit(
        `upload-presign:${session.user.id}`,
        RATE_LIMITS.uploadPresignsPerHour,
        3_600,
      );
    }
    const response = await presign(session, body);
    expect(response.statusCode).toBe(429);
    expect(problemCode(response)).toBe('RATE_LIMITED');
    expect(response.headers['retry-after']).toBeDefined();
  });
});

describe('presigned PUT', () => {
  it('only accepts the declared content type and length', async () => {
    const session = await registerMobile(ctx);
    const response = await presign(session, {
      purpose: 'listing',
      contentType: 'image/jpeg',
      size: JPEG.length,
    });
    const { url } = response.json<Presigned>();

    const wrongType = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': 'text/html' },
      body: new Uint8Array(JPEG),
    });
    expect(wrongType.status).toBe(403);
    const wrongLength = await fetch(url, {
      method: 'PUT',
      headers: { 'content-type': 'image/jpeg' },
      body: new Uint8Array(Buffer.concat([JPEG, Buffer.alloc(10)])),
    });
    expect(wrongLength.status).toBe(403);
  });
});

describe('POST /v1/uploads/:id/complete', () => {
  it('hands a genuine upload to the media job, which makes it ready with a public URL', async () => {
    const session = await registerMobile(ctx);
    const { id } = await putFile(session, 'listing', 'image/jpeg', JPEG);
    const response = await complete(session, id);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id, status: 'processing', url: null });

    await runMediaJobs(ctx);
    const ready = (await call(ctx, 'GET', `/v1/uploads/${id}`, { as: session })).json();
    expect(ready).toMatchObject({ id, status: 'ready', contentType: 'image/webp' });
    expect(ready.url).toMatch(/^https:\/\/media\.supporters\.test\/public\/listing\//);

    // Idempotent.
    expect((await complete(session, id)).json().status).toBe('ready');
  });

  it('cannot be swapped after validation by reusing the presigned URL', async () => {
    const session = await registerMobile(ctx);
    const presigned = await putFile(session, 'listing', 'image/jpeg', JPEG);
    const done = await complete(session, presigned.id);
    expect(done.statusCode).toBe(200);
    await runMediaJobs(ctx);

    // Within its 5 minutes the URL still works. It must not change the validated file.
    const html = Buffer.concat([
      Buffer.from('<script>alert(1)</script>'),
      Buffer.alloc(JPEG.length - 25),
    ]);
    await fetch(presigned.url, {
      method: 'PUT',
      headers: presigned.headers,
      body: new Uint8Array(html),
    });

    const { key } = await prisma.upload.findUniqueOrThrow({ where: { id: presigned.id } });
    const served = await s3.send(new GetObjectCommand({ Bucket: TEST_BUCKET, Key: key }));
    // Re-encoded from the validated bytes: a WebP, not the script.
    expect(Buffer.from((await served.Body?.transformToByteArray()) ?? []).subarray(8, 12)).toEqual(
      Buffer.from('WEBP'),
    );
    // Served from a fresh key that was never presigned, not the one the client can still write to.
    expect(new URL(presigned.url).pathname).not.toContain(key);
  });

  it('never gives private media a public URL', async () => {
    const session = await registerMobile(ctx);
    const { id } = await putFile(session, 'chat', 'application/pdf', PDF);
    expect((await complete(session, id)).json()).toMatchObject({ status: 'processing', url: null });
    await runMediaJobs(ctx);
    expect((await complete(session, id)).json()).toMatchObject({ status: 'ready', url: null });
  });

  it('rejects and deletes a file whose bytes do not match its declared type', async () => {
    const session = await registerMobile(ctx);
    const { id } = await putFile(session, 'listing', 'image/png', JPEG);
    const response = await complete(session, id);
    expect(response.statusCode).toBe(422);
    expect(problemCode(response)).toBe('UPLOAD_REJECTED');

    const { key } = await prisma.upload.findUniqueOrThrow({ where: { id } });
    await expect(
      s3.send(new HeadObjectCommand({ Bucket: TEST_BUCKET, Key: key })),
    ).rejects.toThrow();
    expect((await complete(session, id)).json()).toMatchObject({
      status: 'failed',
      failureReason: 'content_mismatch',
    });
  });

  it('waits for the file before completing', async () => {
    const session = await registerMobile(ctx);
    const response = await presign(session, {
      purpose: 'listing',
      contentType: 'image/jpeg',
      size: 100,
    });
    const early = await complete(session, response.json<Presigned>().id);
    expect(early.statusCode).toBe(409);
    expect(problemCode(early)).toBe('UPLOAD_INCOMPLETE');
  });

  it("rejects guests and hides other users' uploads", async () => {
    const owner = await registerMobile(ctx);
    const stranger = await registerMobile(ctx);
    const { id } = await putFile(owner, 'listing', 'image/jpeg', JPEG);
    expect((await complete(undefined, id)).statusCode).toBe(401);
    expect((await complete(stranger, id)).statusCode).toBe(404);
    expect((await prisma.upload.findUniqueOrThrow({ where: { id } })).status).toBe('pending');
  });
});

describe('listing images', () => {
  it('attaches ready uploads in order and shows them publicly', async () => {
    const { session } = await signUpOwner(ctx, refs);
    const first = await putFile(session, 'listing', 'image/jpeg', JPEG);
    await complete(session, first.id);
    await runMediaJobs(ctx);
    const second = await readyUpload(session.user.id);

    const created = await call(ctx, 'POST', '/v1/me/business/products', {
      as: session,
      body: productBody(refs, { status: 'published', mediaIds: [second, first.id] }),
    });
    expect(created.statusCode).toBe(201);
    const publicView = await call(ctx, 'GET', `/v1/products/${created.json().id}`);
    const images = publicView.json<{ images: { id: string; url: string }[] }>().images;
    expect(images.map((image) => image.id)).toEqual([second, first.id]);
    expect(images[1]?.url).toMatch(/^https:\/\/media\.supporters\.test\/public\/listing\//);

    const reordered = await call(ctx, 'PATCH', `/v1/me/business/products/${created.json().id}`, {
      as: session,
      body: { mediaIds: [first.id] },
    });
    expect(reordered.json().images).toEqual([{ id: first.id, url: images[1]?.url }]);
  });

  it('requires an image to publish, on create and on update', async () => {
    const { session } = await signUpOwner(ctx, refs);
    const create = await call(ctx, 'POST', '/v1/me/business/services', {
      as: session,
      body: serviceBody(refs, { status: 'published' }),
    });
    expect(create.statusCode).toBe(400);
    expect(create.json().errors[0].path).toBe('body.mediaIds');

    const draft = await call(ctx, 'POST', '/v1/me/business/services', {
      as: session,
      body: serviceBody(refs),
    });
    const url = `/v1/me/business/services/${draft.json().id}`;
    const publish = await call(ctx, 'PATCH', url, { as: session, body: { status: 'published' } });
    expect(publish.statusCode).toBe(400);

    await call(ctx, 'PATCH', url, {
      as: session,
      body: { status: 'published', mediaIds: [await readyUpload(session.user.id)] },
    });
    const removeAll = await call(ctx, 'PATCH', url, { as: session, body: { mediaIds: [] } });
    expect(removeAll.statusCode).toBe(400);
  });

  it("rejects other users' uploads, unfinished ones, wrong purposes and reuse", async () => {
    const { session } = await signUpOwner(ctx, refs);
    const other = await registerMobile(ctx);
    const pending = await presign(session, {
      purpose: 'listing',
      contentType: 'image/jpeg',
      size: 100,
    });
    const used = await readyUpload(session.user.id);
    await call(ctx, 'POST', '/v1/me/business/products', {
      as: session,
      body: productBody(refs, { mediaIds: [used] }),
    });

    const invalid = [
      await readyUpload(other.user.id),
      pending.json<Presigned>().id,
      await readyUpload(session.user.id, 'avatar'),
      used,
    ];
    for (const mediaId of invalid) {
      const response = await call(ctx, 'POST', '/v1/me/business/services', {
        as: session,
        body: serviceBody(refs, { mediaIds: [mediaId] }),
      });
      expect(response.statusCode, mediaId).toBe(400);
      expect(response.json().errors[0].path).toBe('body.mediaIds');
    }
  });
});

describe('business logo and cover', () => {
  it('sets them from ready uploads of the right purpose', async () => {
    const { session, business } = await signUpOwner(ctx, refs);
    const logo = await readyUpload(session.user.id, 'avatar');
    const cover = await readyUpload(session.user.id, 'cover');

    const wrongPurpose = await call(ctx, 'PATCH', '/v1/me/business', {
      as: session,
      body: { logoMediaId: cover },
    });
    expect(wrongPurpose.statusCode).toBe(400);

    const before = (await call(ctx, 'GET', '/v1/me/business', { as: session })).json();
    const updated = await call(ctx, 'PATCH', '/v1/me/business', {
      as: session,
      body: { logoMediaId: logo, coverMediaId: cover },
    });
    expect(updated.json()).toMatchObject({ logo: { id: logo }, cover: { id: cover } });
    expect(updated.json().profileCompletion).toBeGreaterThan(before.profileCompletion);

    const page = await call(ctx, 'GET', `/v1/businesses/${business.slug}`);
    expect(page.json().logo.url).toMatch(/^https:\/\/media\.supporters\.test\/public\/avatar\//);

    const cleared = await call(ctx, 'PATCH', '/v1/me/business', {
      as: session,
      body: { logoMediaId: null },
    });
    expect(cleared.json().logo).toBeNull();
  });
});
