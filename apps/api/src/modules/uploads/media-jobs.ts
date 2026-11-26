import { IMAGE_VARIANT_NAMES, MEDIA_LIMITS, type UploadFailureReason } from '@supporters/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { Prisma, PrismaClient, Upload as UploadRow } from '../../generated/prisma/client';
import { MAGIC_BYTES_NEEDED, sniffContentType } from '../../lib/magic-bytes';
import { type MediaProcessor, MediaRejectedError } from './media-processor';
import type { ObjectStorage } from './storage';

/** Outbox type of "this upload is ready to process"; the relay sends it to the `media` queue. */
export const MEDIA_PROCESS_EVENT = 'media.process';

/** A job on the `media` queue. */
export interface MediaJob {
  eventId: string;
  uploadId: string;
}

/**
 * Queues the media job for an upload, in the caller's transaction (transactional outbox, like
 * every other background job), so a committed `processing` upload always has its job.
 */
export async function recordMediaJob(tx: Prisma.TransactionClient, uploadId: string) {
  await tx.outboxEvent.create({ data: { type: MEDIA_PROCESS_EVENT, payload: { uploadId } } });
}

export type UploadKind = 'image' | 'document' | 'video';

export const uploadKind = (contentType: string): UploadKind =>
  contentType.startsWith('image/') ? 'image' : contentType === 'video/mp4' ? 'video' : 'document';

/** Everything an upload stores lives beside its source, under `<prefix>/<random>/`. */
export const keyFolder = (key: string) => key.slice(0, key.lastIndexOf('/'));

/**
 * Where `complete` puts the validated bytes. Images wait here as `source` until the job has
 * written the processed files; PDFs and videos are kept as they are, so this is their final key.
 */
export function stagingKey(folder: string, contentType: string): string {
  switch (uploadKind(contentType)) {
    case 'image':
      return `${folder}/source`;
    case 'video':
      return `${folder}/video.mp4`;
    default:
      return `${folder}/document.pdf`;
  }
}

/** Keys under an upload's folder that a failed or repeated job may have written. */
const possibleKeys = (folder: string) => [
  `${folder}/source`,
  ...IMAGE_VARIANT_NAMES.flatMap((name) =>
    ['webp', 'jpg', 'png'].map((ext) => `${folder}/${name}.${ext}`),
  ),
];

const PUBLIC_CACHE = 'public, max-age=31536000, immutable';

export type MediaJobResult = 'ready' | 'failed' | 'skipped';

/**
 * The `media` job (backend spec, Queues and Security: Uploads), one run per upload:
 * `processing` -> `ready` or `failed`.
 *
 * Safe to run again: processed files have fixed names, so a repeat overwrites them, and the
 * status only moves while it is still `processing`. A file that must be refused (not an image,
 * a decompression bomb, ...) fails the upload at once. Anything else is thrown, so BullMQ
 * retries with backoff; on the last attempt the upload is failed too, so nobody waits forever.
 */
export class MediaJobs {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly storage: ObjectStorage,
    private readonly processor: MediaProcessor,
    private readonly log: FastifyBaseLogger,
  ) {}

  async run(uploadId: string, options: { isFinalAttempt: boolean }): Promise<MediaJobResult> {
    const upload = await this.prisma.upload.findUnique({ where: { id: uploadId } });
    if (!upload || upload.status !== 'processing') return 'skipped';

    try {
      return uploadKind(upload.contentType) === 'image'
        ? await this.processImage(upload)
        : await this.checkPassthrough(upload);
    } catch (error) {
      if (error instanceof MediaRejectedError) return this.fail(upload, error.reason);
      this.log.warn(
        { err: error, uploadId, isFinalAttempt: options.isFinalAttempt },
        'media job failed',
      );
      if (options.isFinalAttempt) return this.fail(upload, 'processing_error');
      throw error;
    }
  }

  private async processImage(upload: UploadRow): Promise<MediaJobResult> {
    const stored = await this.storage.head(upload.key);
    if (!stored) throw new MediaRejectedError('processing_error');
    if (stored.size !== upload.sizeBytes) throw new MediaRejectedError('content_mismatch');
    const bytes = await this.storage.get(upload.key, MEDIA_LIMITS.imageMaxBytes);
    if (bytes.length !== upload.sizeBytes) throw new MediaRejectedError('content_mismatch');

    const outputs = await this.processor.processImage({
      bytes,
      contentType: upload.contentType,
      purpose: upload.purpose,
    });
    const folder = keyFolder(upload.key);
    const isPublic = upload.key.startsWith('public/');
    const keys = new Map<string, { key: string; size: number; contentType: string }>();
    for (const output of outputs) {
      const key = `${folder}/${output.name}.${output.extension}`;
      await this.storage.put(key, output.body, {
        contentType: output.contentType,
        cacheControl: isPublic ? PUBLIC_CACHE : 'private, no-store',
      });
      keys.set(output.name, { key, size: output.body.length, contentType: output.contentType });
    }
    const full = keys.get('full');
    if (!full) throw new Error('processor produced no full-size file');

    const { count } = await this.prisma.upload.updateMany({
      where: { id: upload.id, status: 'processing' },
      data: {
        status: 'ready',
        key: full.key,
        contentType: full.contentType,
        sizeBytes: full.size,
        failureReason: null,
        completedAt: new Date(),
      },
    });
    // Whatever the client uploaded (with its metadata) goes as soon as the processed files stand.
    await this.deleteQuietly([upload.key]);
    return count === 1 ? 'ready' : 'skipped';
  }

  /** PDFs and videos are not re-encoded (see the README); they only have to still be what was checked. */
  private async checkPassthrough(upload: UploadRow): Promise<MediaJobResult> {
    const stored = await this.storage.head(upload.key);
    if (!stored) throw new MediaRejectedError('processing_error');
    const bytes = await this.storage.readStart(upload.key, MAGIC_BYTES_NEEDED);
    if (stored.size !== upload.sizeBytes || sniffContentType(bytes) !== upload.contentType) {
      throw new MediaRejectedError('content_mismatch');
    }
    const { count } = await this.prisma.upload.updateMany({
      where: { id: upload.id, status: 'processing' },
      data: { status: 'ready', failureReason: null, completedAt: new Date() },
    });
    return count === 1 ? 'ready' : 'skipped';
  }

  /** Deletes everything stored for the upload and records why it failed. */
  async fail(upload: UploadRow, reason: UploadFailureReason): Promise<'failed' | 'skipped'> {
    this.log.info({ uploadId: upload.id, reason }, 'upload failed');
    await this.deleteQuietly(possibleKeys(keyFolder(upload.key)).concat(upload.key));
    const { count } = await this.prisma.upload.updateMany({
      where: { id: upload.id, status: { in: ['pending', 'processing'] } },
      data: { status: 'failed', failureReason: reason },
    });
    return count === 1 ? 'failed' : 'skipped';
  }

  private async deleteQuietly(keys: string[]) {
    await Promise.all(
      [...new Set(keys)].map((key) =>
        this.storage.delete(key).catch((err: unknown) => {
          // The object is unreachable by id once the row says failed or ready; the orphan sweep
          // (backend spec, Uploads) removes what is left.
          this.log.warn({ err, key }, 'could not delete upload object');
        }),
      ),
    );
  }
}
