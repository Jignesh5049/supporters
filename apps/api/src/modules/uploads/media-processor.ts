import type { UploadPurpose } from '@supporters/shared';
import type { ObjectStorage } from './storage';

export interface MediaToProcess {
  key: string;
  contentType: string;
  purpose: UploadPurpose;
}

/**
 * Post-upload processing (backend spec, Security: Uploads, and the `media`
 * queue). Throws to reject the upload.
 */
export interface MediaProcessor {
  process(media: MediaToProcess, storage: ObjectStorage): Promise<void>;
}

/**
 * Accepts files as uploaded, after the type, size and magic-byte checks.
 *
 * TODO(media): replace with the BullMQ `media` job: decode and re-encode
 * images to WebP variants with sharp (stripping EXIF and GPS), check video
 * duration and codec with ffprobe, and only then mark the upload ready.
 * Until then images keep their EXIF metadata, so this must not ship to
 * production.
 */
export class PassthroughMediaProcessor implements MediaProcessor {
  async process(): Promise<void> {
    // Intentionally empty; see the TODO above.
  }
}
