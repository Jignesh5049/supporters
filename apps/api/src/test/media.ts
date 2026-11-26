import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { expect, inject } from 'vitest';
import sharp from 'sharp';
import { crc32 } from 'node:zlib';
import { MediaJobs } from '../modules/uploads/media-jobs';
import { type MediaProcessor, SharpMediaProcessor } from '../modules/uploads/media-processor';
import { S3Storage, createS3Client } from '../modules/uploads/storage';
import { call } from './catalog';
import { type MobileSession, type TestContext, prisma } from './helpers';
import { MINIO_CREDENTIALS, TEST_BUCKET } from './minio';

const s3 = new S3Client({
  region: 'ap-south-1',
  endpoint: inject('s3Endpoint'),
  forcePathStyle: true,
  credentials: MINIO_CREDENTIALS,
});

/** Pixels that are not all one colour, so an encoder can't shrink them to nothing. */
const noise = (width: number, height: number) => {
  const data = Buffer.alloc(width * height * 3);
  for (let i = 0; i < data.length; i += 1) data[i] = (i * 31 + (i >> 5) * 17) & 0xff;
  return sharp(data, { raw: { width, height, channels: 3 } });
};

export interface JpegOptions {
  width?: number;
  height?: number;
  /** EXIF orientation tag, 1 to 8. */
  orientation?: number;
  /** Adds a GPS position and camera strings the processed file must not keep. */
  hasMetadata?: boolean;
}

export const SECRET = 'SecretCam-9000';

export function jpeg({
  width = 64,
  height = 32,
  orientation,
  hasMetadata = false,
}: JpegOptions = {}) {
  let image = noise(width, height).jpeg();
  if (hasMetadata) {
    image = image.withExif({
      IFD0: { Make: SECRET, Software: 'EditorX', Copyright: 'owner' },
      IFD3: {
        GPSLatitudeRef: 'N',
        GPSLatitude: '19/1 4/1 0/1',
        GPSLongitudeRef: 'E',
        GPSLongitude: '72/1 52/1 0/1',
      },
    });
  }
  if (orientation) image = image.withMetadata({ orientation });
  return image.toBuffer();
}

export const png = (width = 64, height = 32) => noise(width, height).png().toBuffer();

/** A PNG with an `acTL` chunk after IHDR, which is how an APNG announces its frames. */
export async function animatedPng() {
  const base = await png(16, 16);
  const chunk = Buffer.alloc(20);
  chunk.writeUInt32BE(8, 0);
  chunk.write('acTL', 4, 'ascii');
  chunk.writeUInt32BE(2, 8);
  chunk.writeUInt32BE(0, 12);
  chunk.writeUInt32BE(crc32(chunk.subarray(4, 16)), 16);
  const afterIhdr = 8 + 25;
  return Buffer.concat([base.subarray(0, afterIhdr), chunk, base.subarray(afterIhdr)]);
}

export async function animatedWebp() {
  const frame = (colour: string) =>
    sharp({ create: { width: 8, height: 8, channels: 3, background: colour } })
      .png()
      .toBuffer();
  return sharp([await frame('red'), await frame('blue')], { join: { animated: true } })
    .webp({ loop: 0, delay: [100, 100] })
    .toBuffer();
}

export const PDF = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(40, 2)]);
/** Enough of an MP4 for the magic-byte check: a 24-byte `ftyp` box with the `isom` brand. */
export const MP4 = Buffer.concat([
  Buffer.from([0, 0, 0, 24]),
  Buffer.from('ftypisom'),
  Buffer.alloc(80, 3),
]);

export interface Presigned {
  id: string;
  url: string;
  headers: Record<string, string>;
}

/** Presigns and PUTs `file` straight to MinIO as a client would. Does not call complete. */
export async function putFile(
  ctx: TestContext,
  as: MobileSession,
  purpose: string,
  contentType: string,
  file: Buffer,
): Promise<Presigned> {
  const response = await call(ctx, 'POST', '/v1/uploads/presign', {
    as,
    body: { purpose, contentType, size: file.length },
  });
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

export const completeUpload = (ctx: TestContext, as: MobileSession, id: string) =>
  call(ctx, 'POST', `/v1/uploads/${id}/complete`, { as });

export const getUpload = (ctx: TestContext, as: MobileSession, id: string) =>
  call(ctx, 'GET', `/v1/uploads/${id}`, { as });

/** An S3 client for the test MinIO, and the API's own storage class on top of it. */
export function testStorage(ctx: TestContext) {
  return new S3Storage(createS3Client(ctx.env), TEST_BUCKET);
}

export function mediaJobs(ctx: TestContext, processor: MediaProcessor = new SharpMediaProcessor()) {
  return new MediaJobs(prisma, testStorage(ctx), processor, ctx.app.log);
}

/** Runs the media job for every upload still `processing`, the way the worker would. */
export async function runMediaJobs(
  ctx: TestContext,
  options: { processor?: MediaProcessor; isFinalAttempt?: boolean } = {},
) {
  const jobs = mediaJobs(ctx, options.processor);
  const rows = await prisma.upload.findMany({ where: { status: 'processing' } });
  const results: string[] = [];
  for (const row of rows) {
    results.push(await jobs.run(row.id, { isFinalAttempt: options.isFinalAttempt ?? true }));
  }
  return results;
}

/** Uploads, completes and processes a file; returns the upload as the API reports it. */
export async function processedUpload(
  ctx: TestContext,
  as: MobileSession,
  purpose: string,
  contentType: string,
  file: Buffer,
) {
  const { id } = await putFile(ctx, as, purpose, contentType, file);
  await completeUpload(ctx, as, id);
  await runMediaJobs(ctx);
  return (await getUpload(ctx, as, id)).json<{
    id: string;
    status: string;
    url: string | null;
    variants: { thumb: string; card: string; full: string } | null;
    failureReason: string | null;
    failureMessage: string | null;
    contentType: string;
    size: number;
  }>();
}

export async function objectBytes(key: string): Promise<Buffer> {
  const object = await s3.send(new GetObjectCommand({ Bucket: TEST_BUCKET, Key: key }));
  return Buffer.from((await object.Body?.transformToByteArray()) ?? []);
}

export async function objectExists(key: string): Promise<boolean> {
  return s3
    .send(new HeadObjectCommand({ Bucket: TEST_BUCKET, Key: key }))
    .then(() => true)
    .catch(() => false);
}

export async function objectCacheControl(key: string) {
  const head = await s3.send(new HeadObjectCommand({ Bucket: TEST_BUCKET, Key: key }));
  return head.CacheControl;
}

/** Every key stored under `prefix`. */
export async function keysUnder(prefix: string): Promise<string[]> {
  const listed = await s3.send(new ListObjectsV2Command({ Bucket: TEST_BUCKET, Prefix: prefix }));
  return (listed.Contents ?? []).flatMap((item) => (item.Key ? [item.Key] : []));
}

/** Empties the test bucket, so a test can assert on everything that is stored. */
export async function emptyBucket() {
  for (;;) {
    const listed = await s3.send(new ListObjectsV2Command({ Bucket: TEST_BUCKET }));
    const keys = (listed.Contents ?? []).flatMap((item) => (item.Key ? [{ Key: item.Key }] : []));
    if (keys.length === 0) return;
    await s3.send(new DeleteObjectsCommand({ Bucket: TEST_BUCKET, Delete: { Objects: keys } }));
  }
}
