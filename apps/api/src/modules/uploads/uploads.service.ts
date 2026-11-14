import { randomUUID } from 'node:crypto';
import {
  MEDIA_LIMITS,
  type PresignUploadInput,
  type PresignedUpload,
  RATE_LIMITS,
  UPLOAD_FAILURE_MESSAGES,
  type Upload,
  type UploadFailureReason,
  type Media,
  type UploadPurpose,
  imageVariantUrl,
} from '@supporters/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { PrismaClient, Upload as UploadRow } from '../../generated/prisma/client';
import { AppError, ErrorCode, invalidField, notFound, rateLimited } from '../../lib/errors';
import { MAGIC_BYTES_NEEDED, sniffContentType } from '../../lib/magic-bytes';
import type { SlidingWindowLimiter } from '../../lib/sliding-window';
import { recordMediaJob, stagingKey } from './media-jobs';
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

/** `<prefix>/<random>`: the folder everything of one stored object lives in. */
const newFolder = (purpose: UploadPurpose) =>
  PUBLIC_PURPOSES.has(purpose) ? `public/${purpose}/${randomUUID()}` : `${purpose}/${randomUUID()}`;

const uploadIncomplete = () =>
  new AppError(409, ErrorCode.UploadIncomplete, 'The file has not been uploaded yet');
const uploadRejected = () =>
  new AppError(422, ErrorCode.UploadRejected, 'The file was rejected', {
    detail: UPLOAD_FAILURE_MESSAGES.content_mismatch,
  });

export class UploadsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly limiter: SlidingWindowLimiter,
    private readonly storage: ObjectStorage,
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
        key: `${newFolder(input.purpose)}/upload`,
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
   * Checks the stored object against what was declared (size, type and magic bytes), then hands
   * it to the `media` job and returns at once with `processing`; clients poll `get` until the
   * upload is `ready` or `failed`. A file that fails the checks is deleted and answered with 422.
   * Repeating the call returns the current state.
   */
  async complete(userId: string, id: string): Promise<Upload> {
    const upload = await this.prisma.upload.findFirst({ where: { id, userId } });
    if (!upload) throw notFound();
    if (upload.status !== 'pending') return this.toUpload(upload);

    const stored = await this.storage.head(upload.key);
    if (!stored) {
      const moved = await this.movedByRival(upload.id);
      if (moved) return this.toUpload(moved);
      throw uploadIncomplete();
    }

    const bytes = await this.storage.readStart(upload.key, MAGIC_BYTES_NEEDED);
    const isGenuine =
      stored.size === upload.sizeBytes &&
      stored.contentType === upload.contentType &&
      sniffContentType(bytes) === upload.contentType;
    if (!isGenuine) {
      await this.reject(upload);
      throw uploadRejected();
    }

    // The presigned PUT URL stays valid for its whole TTL, so the client could overwrite the file
    // we just checked. Snapshot the validated bytes under a fresh, never-presigned key and drop
    // the original, so what is processed is exactly what was checked.
    const stagedKey = stagingKey(newFolder(upload.purpose), upload.contentType);
    try {
      await this.storage.copy(upload.key, stagedKey);
      await this.storage.delete(upload.key);
      // Only one of two racing completes wins the move to `processing`, and only it queues the job.
      const moved = await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.upload.updateMany({
          where: { id: upload.id, status: 'pending' },
          data: { status: 'processing', key: stagedKey },
        });
        if (count === 1) await recordMediaJob(tx, upload.id);
        return count === 1;
      });
      if (!moved) await this.storage.delete(stagedKey);
    } catch (error) {
      // A concurrent complete may have moved the original already; report where the upload is.
      const current = await this.movedByRival(upload.id);
      if (current) return this.toUpload(current);
      throw error;
    }
    return this.toUpload(await this.prisma.upload.findUniqueOrThrow({ where: { id: upload.id } }));
  }

  /**
   * When the file is gone while the row is still `pending`, a concurrent complete is moving it:
   * wait a moment for that one to commit and return the row it left.
   */
  private async movedByRival(id: string) {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const current = await this.prisma.upload.findUnique({ where: { id } });
      if (current && current.status !== 'pending') return current;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return null;
  }

  /** One of the user's own uploads, for polling; anyone else's looks the same as an unknown id. */
  async get(userId: string, id: string): Promise<Upload> {
    const upload = await this.prisma.upload.findFirst({ where: { id, userId } });
    if (!upload) throw notFound();
    return this.toUpload(upload);
  }

  /**
   * The user's ready uploads for `purpose`, in the order of `ids`, or a 400
   * naming `path`. Ownership is part of the query, so another user's upload
   * id looks the same as an unknown one.
   */
  async requireReady(userId: string, ids: string[], purpose: UploadPurpose, path: string) {
    if (ids.length === 0) return [];
    // Not filtered by status, so the error can say why an upload can't be used yet.
    const rows = await this.prisma.upload.findMany({ where: { id: { in: ids }, userId, purpose } });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.map((id) => {
      const row = byId.get(id);
      if (!row) throw invalidField(path, 'Unknown upload');
      if (row.status === 'ready') return row;
      throw invalidField(path, notReadyMessage(row.status));
    });
  }

  /** Deletes a file that failed validation and marks the upload failed. */
  private async reject(upload: UploadRow) {
    this.log.info({ uploadId: upload.id, reason: 'content_mismatch' }, 'upload rejected');
    await this.storage.delete(upload.key);
    await this.prisma.upload.update({
      where: { id: upload.id },
      data: { status: 'failed', failureReason: 'content_mismatch' },
    });
  }

  private toUpload(row: UploadRow): Upload {
    const isImage = row.contentType.startsWith('image/');
    const url = row.status === 'ready' ? this.publicUrl(row.key) : null;
    const reason = isFailureReason(row.failureReason) ? row.failureReason : null;
    return {
      id: row.id,
      purpose: row.purpose,
      status: row.status,
      contentType: row.contentType,
      size: row.sizeBytes,
      url,
      variants:
        url && isImage
          ? {
              thumb: imageVariantUrl(url, 'thumb'),
              card: imageVariantUrl(url, 'card'),
              full: url,
            }
          : null,
      failureReason: reason,
      failureMessage: reason ? UPLOAD_FAILURE_MESSAGES[reason] : null,
    };
  }
}

const notReadyMessage = (status: UploadRow['status']) =>
  status === 'pending'
    ? 'The upload is not finished'
    : status === 'processing'
      ? 'The upload is still being processed'
      : 'The upload failed and cannot be used';

const isFailureReason = (value: string | null): value is UploadFailureReason =>
  value !== null && Object.hasOwn(UPLOAD_FAILURE_MESSAGES, value);
