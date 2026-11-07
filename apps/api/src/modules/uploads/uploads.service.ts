import { randomUUID } from 'node:crypto';
import {
  MEDIA_LIMITS,
  type PresignUploadInput,
  type PresignedUpload,
  RATE_LIMITS,
  type Upload,
  type Media,
  type UploadPurpose,
} from '@supporters/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { PrismaClient, Upload as UploadRow } from '../../generated/prisma/client';
import { AppError, ErrorCode, invalidField, notFound, rateLimited } from '../../lib/errors';
import { MAGIC_BYTES_NEEDED, sniffContentType } from '../../lib/magic-bytes';
import type { SlidingWindowLimiter } from '../../lib/sliding-window';
import type { MediaProcessor } from './media-processor';
import type { ObjectStorage } from './storage';

/** Served by media.<domain>; chat/ and kyc/ never are (backend spec, Security: Uploads). */
const PUBLIC_PURPOSES: ReadonlySet<UploadPurpose> = new Set([
  'avatar',
  'cover',
  'listing',
  'post',
  'requirement',
]);

export type MediaUrl = (key: string) => string | null;

/** An attached image as `{ id, url }`, or null when there is none or it isn't public. */
export function toMedia(
  upload: { id: string; key: string } | null,
  mediaUrl: MediaUrl,
): Media | null {
  const url = upload ? mediaUrl(upload.key) : null;
  return upload && url ? { id: upload.id, url } : null;
}

const objectKey = (purpose: UploadPurpose) =>
  PUBLIC_PURPOSES.has(purpose) ? `public/${purpose}/${randomUUID()}` : `${purpose}/${randomUUID()}`;

const uploadIncomplete = () =>
  new AppError(409, ErrorCode.UploadIncomplete, 'The file has not been uploaded yet');
const uploadRejected = () =>
  new AppError(422, ErrorCode.UploadRejected, 'The file was rejected', {
    detail: 'Its contents do not match the declared type or size.',
  });

export class UploadsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly limiter: SlidingWindowLimiter,
    private readonly storage: ObjectStorage,
    private readonly processor: MediaProcessor,
    private readonly mediaBaseUrl: string,
    private readonly log: FastifyBaseLogger,
  ) {}

  /** Public URL for media under public/; null for private prefixes. */
  publicUrl(key: string): string | null {
    return key.startsWith('public/') ? `${this.mediaBaseUrl}/${key}` : null;
  }

  async presign(userId: string, input: PresignUploadInput): Promise<PresignedUpload> {
    const limit = await this.limiter.hit(
      `upload-presign:${userId}`,
      RATE_LIMITS.uploadPresignsPerHour,
      3_600,
    );
    if (!limit.allowed) throw rateLimited(limit.resetMs / 1000);

    const upload = await this.prisma.upload.create({
      data: {
        userId,
        purpose: input.purpose,
        key: objectKey(input.purpose),
        contentType: input.contentType,
        sizeBytes: input.size,
      },
    });
    const ttlSec = MEDIA_LIMITS.presignTtlSec;
    const url = await this.storage.presignPut(upload.key, input.contentType, input.size, ttlSec);
    return {
      id: upload.id,
      url,
      method: 'PUT',
      headers: { 'content-type': input.contentType },
      expiresAt: new Date(upload.createdAt.getTime() + ttlSec * 1000).toISOString(),
    };
  }

  /**
   * Checks the stored object against what was declared (size, type and magic
   * bytes), runs the media processor, and marks the upload ready. Anything
   * that fails is deleted. Repeating the call returns the current state.
   */
  async complete(userId: string, id: string): Promise<Upload> {
    const upload = await this.prisma.upload.findFirst({ where: { id, userId } });
    if (!upload) throw notFound();
    if (upload.status !== 'pending') return this.toUpload(upload);

    const stored = await this.storage.head(upload.key);
    if (!stored) throw uploadIncomplete();

    const bytes = await this.storage.readStart(upload.key, MAGIC_BYTES_NEEDED);
    const isGenuine =
      stored.size === upload.sizeBytes &&
      stored.contentType === upload.contentType &&
      sniffContentType(bytes) === upload.contentType;
    if (!isGenuine) return this.reject(upload, 'content mismatch');

    try {
      await this.processor.process(upload, this.storage);
    } catch (error) {
      this.log.warn({ err: error, uploadId: upload.id }, 'media processing failed');
      return this.reject(upload, 'processing failed');
    }

    const ready = await this.prisma.upload.update({
      where: { id: upload.id },
      data: { status: 'ready', completedAt: new Date() },
    });
    return this.toUpload(ready);
  }

  /**
   * The user's ready uploads for `purpose`, in the order of `ids`, or a 400
   * naming `path`. Ownership is part of the query, so another user's upload
   * id looks the same as an unknown one.
   */
  async requireReady(userId: string, ids: string[], purpose: UploadPurpose, path: string) {
    if (ids.length === 0) return [];
    const rows = await this.prisma.upload.findMany({
      where: { id: { in: ids }, userId, purpose, status: 'ready' },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.map((id) => {
      const row = byId.get(id);
      if (!row) throw invalidField(path, 'Unknown or unfinished upload');
      return row;
    });
  }

  private async reject(upload: UploadRow, reason: string): Promise<never> {
    this.log.info({ uploadId: upload.id, reason }, 'upload rejected');
    await this.storage.delete(upload.key);
    await this.prisma.upload.update({ where: { id: upload.id }, data: { status: 'rejected' } });
    throw uploadRejected();
  }

  private toUpload(row: UploadRow): Upload {
    return {
      id: row.id,
      purpose: row.purpose,
      status: row.status,
      contentType: row.contentType,
      size: row.sizeBytes,
      url: row.status === 'ready' ? this.publicUrl(row.key) : null,
    };
  }
}
