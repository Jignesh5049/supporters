import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Env } from '../../config/env';

export interface StoredObject {
  size: number;
  contentType: string | undefined;
}

/** The object store behind uploads: S3 in AWS, MinIO locally and in tests. */
export interface ObjectStorage {
  /** A PUT URL that only accepts this exact content type and length. */
  presignPut(key: string, contentType: string, size: number, ttlSec: number): Promise<string>;
  /** A short-lived GET URL for a private object. */
  presignGet(key: string, ttlSec: number, options: { contentType: string }): Promise<string>;
  head(key: string): Promise<StoredObject | null>;
  /** The first `length` bytes, for the magic-byte check. */
  readStart(key: string, length: number): Promise<Uint8Array>;
  delete(key: string): Promise<void>;
  /** Server-side copy, keeping the content type. */
  copy(from: string, to: string): Promise<void>;
  /** The whole object. Refuses (throws) anything larger than `maxBytes`, so a swapped file can't exhaust memory. */
  get(key: string, maxBytes: number): Promise<Buffer>;
  /** Creates or replaces an object. */
  put(key: string, body: Buffer, options: PutOptions): Promise<void>;
}

export interface PutOptions {
  contentType: string;
  /** `Cache-Control` for the object; public variants are immutable because their keys are never reused. */
  cacheControl?: string;
}

const isNotFound = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  '$metadata' in error &&
  (error as { $metadata: { httpStatusCode?: number } }).$metadata.httpStatusCode === 404;

export const createS3Client = (env: Env) =>
  new S3Client({
    region: env.S3_REGION,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    // Presigned URLs must not carry an SDK-computed checksum of an empty body.
    requestChecksumCalculation: 'WHEN_REQUIRED',
    ...(env.S3_ENDPOINT ? { endpoint: env.S3_ENDPOINT } : {}),
    ...(env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY
      ? {
          credentials: {
            accessKeyId: env.S3_ACCESS_KEY_ID,
            secretAccessKey: env.S3_SECRET_ACCESS_KEY,
          },
        }
      : {}),
  });

export class S3Storage implements ObjectStorage {
  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  presignPut(key: string, contentType: string, size: number, ttlSec: number) {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    });
    // Signing both headers makes S3 reject any other type or length.
    return getSignedUrl(this.client, command, {
      expiresIn: ttlSec,
      signableHeaders: new Set(['content-type', 'content-length']),
    });
  }

  presignGet(key: string, ttlSec: number, options: { contentType: string }) {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ResponseContentType: options.contentType,
      // Documents download instead of rendering in the browser.
      ResponseContentDisposition: options.contentType.startsWith('image/')
        ? 'inline'
        : 'attachment',
    });
    return getSignedUrl(this.client, command, { expiresIn: ttlSec });
  }

  async head(key: string): Promise<StoredObject | null> {
    try {
      const head = await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return { size: head.ContentLength ?? 0, contentType: head.ContentType };
    } catch (error) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  async readStart(key: string, length: number) {
    const object = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key, Range: `bytes=0-${length - 1}` }),
    );
    return object.Body ? object.Body.transformToByteArray() : new Uint8Array();
  }

  async copy(from: string, to: string) {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        Key: to,
        // Keys are server-generated (purpose/uuid), so they need no escaping.
        CopySource: `${this.bucket}/${from}`,
      }),
    );
  }

  async get(key: string, maxBytes: number) {
    const object = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    if ((object.ContentLength ?? 0) > maxBytes) {
      await object.Body?.transformToWebStream().cancel();
      throw new Error('object is larger than expected');
    }
    return Buffer.from((await object.Body?.transformToByteArray()) ?? []);
  }

  async put(key: string, body: Buffer, options: PutOptions) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: options.contentType,
        ...(options.cacheControl ? { CacheControl: options.cacheControl } : {}),
      }),
    );
  }

  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
