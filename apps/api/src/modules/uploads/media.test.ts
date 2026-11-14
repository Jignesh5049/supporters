import { randomUUID } from 'node:crypto';
import { IMAGE_VARIANT_PX, MEDIA_LIMITS } from '@supporters/shared';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { relayOutbox } from '../../jobs/outbox-relay';
import { startNotificationWorker } from '../../jobs/worker';
import {
  call,
  referenceData,
  signUpOwner,
  type ReferenceData,
  serviceBody,
} from '../../test/catalog';
import {
  type TestContext,
  createTestApp,
  prisma,
  registerMobile,
  resetState,
  valkey,
} from '../../test/helpers';
import {
  MP4,
  PDF,
  SECRET,
  animatedPng,
  animatedWebp,
  completeUpload,
  emptyBucket,
  getUpload,
  jpeg,
  keysUnder,
  mediaJobs,
  objectBytes,
  objectCacheControl,
  objectExists,
  png,
  processedUpload,
  putFile,
  runMediaJobs,
  testStorage,
} from '../../test/media';
import { FakeEmail, FakeExpo } from '../../test/notifications';
import { MediaJobs, MEDIA_PROCESS_EVENT } from './media-jobs';
import {
  type MediaProcessor,
  PassthroughMediaProcessor,
  SharpMediaProcessor,
  assertDeployableMediaProcessor,
} from './media-processor';

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
  await emptyBucket();
});

const dims = async (key: string) => {
  const { width, height, format } = await sharp(await objectBytes(key)).metadata();
  return { width, height, format };
};

describe('the upload state machine', () => {
  it('answers complete at once with processing, then ready after the job', async () => {
    const session = await registerMobile(ctx);
    const { id } = await putFile(ctx, session, 'listing', 'image/jpeg', await jpeg());
    const response = await completeUpload(ctx, session, id);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id, status: 'processing', url: null, variants: null });

    // Polling sees the same until the job has run.
    expect((await getUpload(ctx, session, id)).json().status).toBe('processing');
    expect(await runMediaJobs(ctx)).toEqual(['ready']);

    const ready = (await getUpload(ctx, session, id)).json();
    expect(ready).toMatchObject({ status: 'ready', contentType: 'image/webp' });
    expect(ready.url).toMatch(
      /^https:\/\/media\.supporters\.test\/public\/listing\/.+\/full\.webp$/,
    );
    expect(ready.variants.thumb).toMatch(/\/thumb\.webp$/);
    expect(ready.variants.card).toMatch(/\/card\.webp$/);
    expect(ready.variants.full).toBe(ready.url);

    // Completing again is harmless and queues nothing more.
    expect((await completeUpload(ctx, session, id)).json().status).toBe('ready');
    expect(await prisma.outboxEvent.count({ where: { type: MEDIA_PROCESS_EVENT } })).toBe(1);
  });

  it('queues exactly one job when complete is called twice at once', async () => {
    const session = await registerMobile(ctx);
    const { id } = await putFile(ctx, session, 'listing', 'image/jpeg', await jpeg());
    const [a, b] = await Promise.all([
      completeUpload(ctx, session, id),
      completeUpload(ctx, session, id),
    ]);
    expect([a.statusCode, b.statusCode]).toEqual([200, 200]);
    expect(await prisma.outboxEvent.count({ where: { type: MEDIA_PROCESS_EVENT } })).toBe(1);
    expect(await keysUnder('public/listing/')).toHaveLength(1);
  });

  it('only lets the owner poll an upload', async () => {
    const owner = await registerMobile(ctx);
    const stranger = await registerMobile(ctx);
    const { id } = await putFile(ctx, owner, 'listing', 'image/jpeg', await jpeg());
    expect((await getUpload(ctx, owner, id)).statusCode).toBe(200);
    expect((await getUpload(ctx, stranger, id)).statusCode).toBe(404);
    expect((await call(ctx, 'GET', `/v1/uploads/${id}`)).statusCode).toBe(401);
  });

  it('refuses to attach an upload that is not ready, saying why', async () => {
    const { session } = await signUpOwner(ctx, refs);
    const processing = await putFile(ctx, session, 'listing', 'image/jpeg', await jpeg());
    await completeUpload(ctx, session, processing.id);
    const failing = await putFile(ctx, session, 'listing', 'image/jpeg', await jpeg());
    await prisma.upload.update({ where: { id: failing.id }, data: { status: 'failed' } });

    for (const [id, message] of [
      [processing.id, 'still being processed'],
      [failing.id, 'failed'],
    ] as const) {
      const response = await call(ctx, 'POST', '/v1/me/business/services', {
        as: session,
        body: serviceBody(refs, { mediaIds: [id] }),
      });
      expect(response.statusCode).toBe(400);
      expect(response.json().errors[0]).toMatchObject({ path: 'body.mediaIds' });
      expect(JSON.stringify(response.json())).toContain(message);
    }

    // Once processed, the same upload attaches.
    await runMediaJobs(ctx);
    const ok = await call(ctx, 'POST', '/v1/me/business/services', {
      as: session,
      body: serviceBody(refs, { mediaIds: [processing.id] }),
    });
    expect(ok.statusCode).toBe(201);
  });

  it('gates every purpose on ready, whoever attaches it', async () => {
    const session = await registerMobile(ctx);
    const { uploads } = ctx.app.services;
    for (const purpose of [
      'listing',
      'post',
      'avatar',
      'cover',
      'chat',
      'kyc',
      'requirement',
    ] as const) {
      for (const status of ['pending', 'processing', 'failed', 'rejected'] as const) {
        const row = await prisma.upload.create({
          data: {
            userId: session.user.id,
            purpose,
            key: `${purpose}/${randomUUID()}/x`,
            contentType: 'image/jpeg',
            sizeBytes: 10,
            status,
          },
        });
        await expect(
          uploads.requireReady(session.user.id, [row.id], purpose, 'body.x'),
        ).rejects.toThrow();
      }
      const ready = await prisma.upload.create({
        data: {
          userId: session.user.id,
          purpose,
          key: `${purpose}/${randomUUID()}/full.webp`,
          contentType: 'image/webp',
          sizeBytes: 10,
          status: 'ready',
        },
      });
      await expect(
        uploads.requireReady(session.user.id, [ready.id], purpose, 'body.x'),
      ).resolves.toHaveLength(1);
    }
  });
});

describe('image re-encoding', () => {
  it('strips EXIF and GPS from every stored file and keeps only WebP pixels', async () => {
    const session = await registerMobile(ctx);
    const original = await jpeg({ width: 800, height: 600, hasMetadata: true });
    // The fixture really has what we claim to remove.
    expect((await sharp(original).metadata()).exif).toBeDefined();
    expect(original.includes(SECRET)).toBe(true);

    const upload = await processedUpload(ctx, session, 'listing', 'image/jpeg', original);
    expect(upload.status).toBe('ready');
    const { key } = await prisma.upload.findUniqueOrThrow({ where: { id: upload.id } });
    const folder = key.slice(0, key.lastIndexOf('/'));
    const stored = await keysUnder(folder);
    expect(stored.sort()).toEqual([
      `${folder}/card.webp`,
      `${folder}/full.webp`,
      `${folder}/thumb.webp`,
    ]);

    for (const name of stored) {
      const bytes = await objectBytes(name);
      const meta = await sharp(bytes).metadata();
      expect(meta.format).toBe('webp');
      expect(meta.exif).toBeUndefined();
      expect(meta.icc).toBeUndefined();
      expect(meta.xmp).toBeUndefined();
      expect(meta.orientation).toBeUndefined();
      expect(bytes.includes(SECRET)).toBe(false);
      expect(bytes.includes('EditorX')).toBe(false);
      expect(bytes.includes('Exif')).toBe(false);
    }
  });

  it('applies the orientation before dropping it', async () => {
    const session = await registerMobile(ctx);
    // 40 wide, 20 high, "rotate 90 degrees to display": shown 20 wide, 40 high.
    const upload = await processedUpload(
      ctx,
      session,
      'listing',
      'image/jpeg',
      await jpeg({ width: 40, height: 20, orientation: 6 }),
    );
    const { key } = await prisma.upload.findUniqueOrThrow({ where: { id: upload.id } });
    expect(await dims(key)).toEqual({ width: 20, height: 40, format: 'webp' });
  });

  it('makes thumbnail, card and full sizes by longest side, and never enlarges', async () => {
    const session = await registerMobile(ctx);
    const big = await processedUpload(
      ctx,
      session,
      'listing',
      'image/jpeg',
      await jpeg({ width: 2400, height: 1200 }),
    );
    const { key } = await prisma.upload.findUniqueOrThrow({ where: { id: big.id } });
    const folder = key.slice(0, key.lastIndexOf('/'));
    expect(await dims(`${folder}/thumb.webp`)).toMatchObject({
      width: IMAGE_VARIANT_PX.thumb,
      height: 160,
    });
    expect(await dims(`${folder}/card.webp`)).toMatchObject({
      width: IMAGE_VARIANT_PX.card,
      height: 360,
    });
    expect(await dims(`${folder}/full.webp`)).toMatchObject({
      width: IMAGE_VARIANT_PX.full,
      height: 800,
    });

    const tall = await processedUpload(ctx, session, 'post', 'image/png', await png(500, 1000));
    const tallKey = (await prisma.upload.findUniqueOrThrow({ where: { id: tall.id } })).key;
    const tallFolder = tallKey.slice(0, tallKey.lastIndexOf('/'));
    expect(await dims(`${tallFolder}/thumb.webp`)).toMatchObject({ width: 160, height: 320 });
    expect(await dims(`${tallFolder}/card.webp`)).toMatchObject({ width: 360, height: 720 });
    // 1000 px is under 1600: the full size is the image itself, not enlarged.
    expect(await dims(`${tallFolder}/full.webp`)).toMatchObject({ width: 500, height: 1000 });

    const small = await processedUpload(
      ctx,
      session,
      'listing',
      'image/jpeg',
      await jpeg({ width: 100, height: 50 }),
    );
    const smallKey = (await prisma.upload.findUniqueOrThrow({ where: { id: small.id } })).key;
    const smallFolder = smallKey.slice(0, smallKey.lastIndexOf('/'));
    for (const name of ['thumb', 'card', 'full']) {
      expect(await dims(`${smallFolder}/${name}.webp`)).toMatchObject({ width: 100, height: 50 });
    }
  });

  it('crops avatars to squares, never larger than the photo', async () => {
    const session = await registerMobile(ctx);
    const upload = await processedUpload(
      ctx,
      session,
      'avatar',
      'image/jpeg',
      await jpeg({ width: 1000, height: 500 }),
    );
    const { key } = await prisma.upload.findUniqueOrThrow({ where: { id: upload.id } });
    const folder = key.slice(0, key.lastIndexOf('/'));
    expect(await dims(`${folder}/thumb.webp`)).toMatchObject({ width: 96, height: 96 });
    expect(await dims(`${folder}/card.webp`)).toMatchObject({ width: 320, height: 320 });
    expect(await dims(`${folder}/full.webp`)).toMatchObject({ width: 500, height: 500 });
  });

  it('serves public variants as immutable, with a content type of image/webp', async () => {
    const session = await registerMobile(ctx);
    const upload = await processedUpload(ctx, session, 'listing', 'image/jpeg', await jpeg());
    const { key } = await prisma.upload.findUniqueOrThrow({ where: { id: upload.id } });
    expect(await objectCacheControl(key)).toBe('public, max-age=31536000, immutable');
    expect(upload.contentType).toBe('image/webp');
  });

  it('deletes the file the client uploaded once the processed files exist', async () => {
    const session = await registerMobile(ctx);
    const upload = await processedUpload(ctx, session, 'listing', 'image/jpeg', await jpeg());
    const { key } = await prisma.upload.findUniqueOrThrow({ where: { id: upload.id } });
    const folder = key.slice(0, key.lastIndexOf('/'));
    expect(await objectExists(`${folder}/source`)).toBe(false);
    expect(await keysUnder('public/listing/')).toHaveLength(3);
  });
});

describe('refused files', () => {
  const expectFailed = async (
    purpose: string,
    contentType: string,
    file: Buffer,
    reasons: string[],
  ) => {
    const session = await registerMobile(ctx);
    const { id } = await putFile(ctx, session, purpose, contentType, file);
    const completed = await completeUpload(ctx, session, id);
    expect(completed.statusCode, completed.body).toBe(200);
    expect(await runMediaJobs(ctx)).toEqual(['failed']);
    const upload = (await getUpload(ctx, session, id)).json();
    expect(upload.status).toBe('failed');
    expect(reasons).toContain(upload.failureReason);
    expect(upload.failureMessage).toEqual(expect.any(String));
    expect(upload.url).toBeNull();
    // Nothing is left in storage.
    expect(await keysUnder(`${purpose === 'listing' ? 'public/' : ''}${purpose}/`)).toEqual([]);
    return upload;
  };

  it('rejects a script disguised as a JPEG', async () => {
    const payload = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.from('<script>alert(document.cookie)</script><html>'),
    ]);
    await expectFailed('listing', 'image/jpeg', payload, ['corrupt', 'unsupported_format']);
  });

  it('re-encodes a real JPEG that has a script appended, so the script does not survive', async () => {
    const session = await registerMobile(ctx);
    const polyglot = Buffer.concat([await jpeg(), Buffer.from('<script>alert(1)</script>')]);
    const upload = await processedUpload(ctx, session, 'listing', 'image/jpeg', polyglot);
    if (upload.status === 'ready') {
      const { key } = await prisma.upload.findUniqueOrThrow({ where: { id: upload.id } });
      const folder = key.slice(0, key.lastIndexOf('/'));
      for (const name of await keysUnder(folder)) {
        expect((await objectBytes(name)).includes('<script')).toBe(false);
      }
    } else {
      expect(upload.status).toBe('failed');
    }
  });

  it('rejects an HTML page whose first bytes are a PNG signature', async () => {
    const payload = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('<html><script>alert(1)</script></html>'),
    ]);
    await expectFailed('listing', 'image/png', payload, ['corrupt', 'unsupported_format']);
  });

  it('rejects a decompression bomb by its dimensions without decoding it', async () => {
    // 41 million pixels in a few kilobytes: over the pixel cap, but each side is allowed.
    const bomb = await sharp({
      create: { width: 6_400, height: 6_400, channels: 3, background: '#000' },
    })
      .png({ compressionLevel: 9 })
      .toBuffer();
    expect(bomb.length).toBeLessThan(MEDIA_LIMITS.imageMaxBytes);
    await expectFailed('listing', 'image/png', bomb, ['too_large_dimensions']);
  });

  it('rejects an image with a side over the cap', async () => {
    const wide = await sharp({
      create: {
        width: MEDIA_LIMITS.imageMaxSidePx + 1,
        height: 1,
        channels: 3,
        background: '#000',
      },
    })
      .png()
      .toBuffer();
    await expectFailed('listing', 'image/png', wide, ['too_large_dimensions']);
  });

  it('rejects animated WebP and APNG', async () => {
    await expectFailed('listing', 'image/webp', await animatedWebp(), ['animated']);
    await expectFailed('listing', 'image/png', await animatedPng(), ['animated']);
  });

  it('rejects HEIC with a clear reason', async () => {
    const heic = Buffer.concat([
      Buffer.from([0, 0, 0, 24]),
      Buffer.from('ftypheic'),
      Buffer.alloc(80),
    ]);
    const upload = await expectFailed('listing', 'image/heic', heic, ['heic_unsupported']);
    expect(upload.failureMessage).toMatch(/JPEG or PNG/);
  });

  it('rejects at complete a file whose bytes are not what was declared', async () => {
    const session = await registerMobile(ctx);
    const { id } = await putFile(ctx, session, 'listing', 'image/png', await jpeg());
    const response = await completeUpload(ctx, session, id);
    expect(response.statusCode).toBe(422);
    expect(response.json().code).toBe('UPLOAD_REJECTED');
    expect(await runMediaJobs(ctx)).toEqual([]);
    expect(await keysUnder('public/listing/')).toEqual([]);
    expect(await getUpload(ctx, session, id)).toMatchObject({ statusCode: 200 });
    expect((await getUpload(ctx, session, id)).json()).toMatchObject({
      status: 'failed',
      failureReason: 'content_mismatch',
    });
    // The same answer on a repeat, as before.
    expect((await completeUpload(ctx, session, id)).json().status).toBe('failed');
  });

  it('fails an upload whose file was swapped before the job ran', async () => {
    const session = await registerMobile(ctx);
    const { id } = await putFile(ctx, session, 'listing', 'image/jpeg', await jpeg());
    await completeUpload(ctx, session, id);
    const { key } = await prisma.upload.findUniqueOrThrow({ where: { id } });
    // The staged key is never presigned; this stands in for whoever could still write there.
    await testStorage(ctx).put(key, Buffer.from('<script>alert(1)</script>'), {
      contentType: 'image/jpeg',
    });
    expect(await runMediaJobs(ctx)).toEqual(['failed']);
    expect((await getUpload(ctx, session, id)).json().failureReason).toBe('content_mismatch');
  });
});

describe('private and non-image uploads', () => {
  it('re-encodes KYC and chat images into one private file, with no public variants', async () => {
    const session = await registerMobile(ctx);
    for (const purpose of ['kyc', 'chat'] as const) {
      const upload = await processedUpload(
        ctx,
        session,
        purpose,
        'image/jpeg',
        await jpeg({ width: 1800, height: 900, hasMetadata: true }),
      );
      expect(upload).toMatchObject({
        status: 'ready',
        url: null,
        variants: null,
        contentType: 'image/webp',
      });
      const { key } = await prisma.upload.findUniqueOrThrow({ where: { id: upload.id } });
      expect(key).toMatch(new RegExp(`^${purpose}/.+/full\\.webp$`));
      expect(await keysUnder(`${purpose}/`)).toEqual([key]);
      const bytes = await objectBytes(key);
      expect((await sharp(bytes).metadata()).exif).toBeUndefined();
      expect(bytes.includes(SECRET)).toBe(false);
      expect(await objectCacheControl(key)).toBe('private, no-store');
    }
    // Chat is capped at the full size; KYC keeps more pixels so small print stays readable.
    const kyc = await prisma.upload.findFirstOrThrow({ where: { purpose: 'kyc' } });
    const chat = await prisma.upload.findFirstOrThrow({ where: { purpose: 'chat' } });
    expect((await dims(kyc.key)).width).toBe(1800);
    expect((await dims(chat.key)).width).toBe(IMAGE_VARIANT_PX.full);
  });

  it('leaves PDFs exactly as uploaded and private', async () => {
    const session = await registerMobile(ctx);
    for (const purpose of ['chat', 'kyc'] as const) {
      const upload = await processedUpload(ctx, session, purpose, 'application/pdf', PDF);
      expect(upload).toMatchObject({
        status: 'ready',
        url: null,
        variants: null,
        contentType: 'application/pdf',
      });
      const { key } = await prisma.upload.findUniqueOrThrow({ where: { id: upload.id } });
      expect(key).toMatch(new RegExp(`^${purpose}/.+/document\\.pdf$`));
      expect(await objectBytes(key)).toEqual(PDF);
    }
  });

  it('marks a post video ready without transcoding it', async () => {
    const session = await registerMobile(ctx);
    const upload = await processedUpload(ctx, session, 'post', 'video/mp4', MP4);
    expect(upload).toMatchObject({ status: 'ready', contentType: 'video/mp4', variants: null });
    expect(upload.url).toMatch(/\/public\/post\/.+\/video\.mp4$/);
    expect(
      await objectBytes((await prisma.upload.findUniqueOrThrow({ where: { id: upload.id } })).key),
    ).toEqual(MP4);
  });
});

describe('retries and cleanup', () => {
  class Flaky implements MediaProcessor {
    calls = 0;
    constructor(private readonly failures: number) {}
    async processImage(...args: Parameters<MediaProcessor['processImage']>) {
      this.calls += 1;
      if (this.calls <= this.failures) throw new Error('libvips is having a day');
      return new SharpMediaProcessor().processImage(...args);
    }
  }

  it('can be run again after a transient failure, and a repeat is a no-op', async () => {
    const session = await registerMobile(ctx);
    const { id } = await putFile(ctx, session, 'listing', 'image/jpeg', await jpeg());
    await completeUpload(ctx, session, id);
    const flaky = new Flaky(1);

    // The first try throws, so BullMQ would retry; the upload stays processing and keeps its file.
    await expect(runMediaJobs(ctx, { processor: flaky, isFinalAttempt: false })).rejects.toThrow(
      'libvips',
    );
    expect((await getUpload(ctx, session, id)).json().status).toBe('processing');
    expect(await keysUnder('public/listing/')).toHaveLength(1);

    expect(await runMediaJobs(ctx, { processor: flaky, isFinalAttempt: false })).toEqual(['ready']);
    const stored = await keysUnder('public/listing/');
    expect(stored).toHaveLength(3);

    // Running the same job again (a duplicate delivery) changes nothing.
    const jobs = mediaJobs(ctx, flaky);
    expect(await jobs.run(id, { isFinalAttempt: false })).toBe('skipped');
    expect(await keysUnder('public/listing/')).toEqual(stored);
    expect((await getUpload(ctx, session, id)).json().status).toBe('ready');
  });

  it('is idempotent when a crash left some processed files behind', async () => {
    const session = await registerMobile(ctx);
    const { id } = await putFile(
      ctx,
      session,
      'listing',
      'image/jpeg',
      await jpeg({ width: 900, height: 900 }),
    );
    await completeUpload(ctx, session, id);
    const row = await prisma.upload.findUniqueOrThrow({ where: { id } });
    const folder = row.key.slice(0, row.key.lastIndexOf('/'));
    // As if a previous attempt wrote the thumbnail and then died.
    await testStorage(ctx).put(`${folder}/thumb.webp`, Buffer.from('partial'), {
      contentType: 'image/webp',
    });
    expect(await runMediaJobs(ctx)).toEqual(['ready']);
    expect((await dims(`${folder}/thumb.webp`)).width).toBe(320);
  });

  it('fails the upload and cleans up when the last attempt fails', async () => {
    const session = await registerMobile(ctx);
    const { id } = await putFile(ctx, session, 'listing', 'image/jpeg', await jpeg());
    await completeUpload(ctx, session, id);
    expect(await runMediaJobs(ctx, { processor: new Flaky(5), isFinalAttempt: true })).toEqual([
      'failed',
    ]);
    expect((await getUpload(ctx, session, id)).json()).toMatchObject({
      status: 'failed',
      failureReason: 'processing_error',
    });
    expect(await keysUnder('public/listing/')).toEqual([]);
  });
});

describe('the media queue', () => {
  const start = (mediaProcessor: MediaProcessor) =>
    startNotificationWorker({
      env: ctx.env,
      prisma,
      valkey,
      expo: new FakeExpo(),
      webPush: null,
      email: new FakeEmail(),
      mediaJobs: new MediaJobs(prisma, testStorage(ctx), mediaProcessor, ctx.app.log),
      log: ctx.app.log,
      backoffMs: 5,
      relayIntervalMs: 20,
      prefix: `test-${randomUUID()}`,
      isCleanupScheduled: false,
    });

  it('routes media.process events to the media queue', async () => {
    const session = await registerMobile(ctx);
    const { id } = await putFile(ctx, session, 'listing', 'image/jpeg', await jpeg());
    await completeUpload(ctx, session, id);
    const jobs: { id: string | undefined; data: unknown }[] = [];
    await relayOutbox(prisma, {
      notifications: { addBulk: async () => 0 },
      searchIndex: { addBulk: async () => 0 },
      media: {
        addBulk: async (added) =>
          jobs.push(...added.map((job) => ({ id: job.opts.jobId, data: job.data }))),
      },
    });
    const event = await prisma.outboxEvent.findFirstOrThrow({
      where: { type: MEDIA_PROCESS_EVENT },
    });
    expect(jobs).toEqual([{ id: `media-${event.id}`, data: { eventId: event.id, uploadId: id } }]);
  });

  it('turns a completed upload into a ready one through the worker', async () => {
    const worker = await start(new SharpMediaProcessor());
    try {
      const session = await registerMobile(ctx);
      const { id } = await putFile(ctx, session, 'listing', 'image/jpeg', await jpeg());
      await completeUpload(ctx, session, id);
      await vi.waitFor(
        async () => expect((await getUpload(ctx, session, id)).json().status).toBe('ready'),
        { timeout: 15_000, interval: 100 },
      );
      expect(
        await prisma.outboxEvent.count({ where: { type: MEDIA_PROCESS_EVENT, processedAt: null } }),
      ).toBe(0);
    } finally {
      await worker.close();
    }
  });

  it('retries a failing job three times with backoff, then fails the upload', async () => {
    let calls = 0;
    const alwaysFails: MediaProcessor = {
      processImage: async () => {
        calls += 1;
        throw new Error('boom');
      },
    };
    const worker = await start(alwaysFails);
    try {
      const session = await registerMobile(ctx);
      const { id } = await putFile(ctx, session, 'listing', 'image/jpeg', await jpeg());
      await completeUpload(ctx, session, id);
      await vi.waitFor(
        async () => expect((await getUpload(ctx, session, id)).json().status).toBe('failed'),
        { timeout: 15_000, interval: 100 },
      );
      expect(calls).toBe(MEDIA_LIMITS.processingAttempts);
      expect((await getUpload(ctx, session, id)).json().failureReason).toBe('processing_error');
    } finally {
      await worker.close();
    }
  });

  it('succeeds on the second try after one transient failure', async () => {
    let calls = 0;
    const real = new SharpMediaProcessor();
    const flaky: MediaProcessor = {
      processImage: async (image) => {
        calls += 1;
        if (calls === 1) throw new Error('transient');
        return real.processImage(image);
      },
    };
    const worker = await start(flaky);
    try {
      const session = await registerMobile(ctx);
      const { id } = await putFile(ctx, session, 'listing', 'image/jpeg', await jpeg());
      await completeUpload(ctx, session, id);
      await vi.waitFor(
        async () => expect((await getUpload(ctx, session, id)).json().status).toBe('ready'),
        { timeout: 15_000, interval: 100 },
      );
      expect(calls).toBe(2);
    } finally {
      await worker.close();
    }
  });
});

describe('the deployment guard', () => {
  it('refuses the passthrough processor in staging and production only', () => {
    const passthrough = new PassthroughMediaProcessor();
    expect(() => assertDeployableMediaProcessor({ NODE_ENV: 'production' }, passthrough)).toThrow(
      /passthrough/,
    );
    expect(() => assertDeployableMediaProcessor({ NODE_ENV: 'staging' }, passthrough)).toThrow(
      /passthrough/,
    );
    expect(() =>
      assertDeployableMediaProcessor({ NODE_ENV: 'development' }, passthrough),
    ).not.toThrow();
    expect(() => assertDeployableMediaProcessor({ NODE_ENV: 'test' }, passthrough)).not.toThrow();
    expect(() =>
      assertDeployableMediaProcessor({ NODE_ENV: 'production' }, new SharpMediaProcessor()),
    ).not.toThrow();
  });
});
