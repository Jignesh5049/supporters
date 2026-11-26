import {
  IMAGE_VARIANT_PX,
  MEDIA_LIMITS,
  type ImageVariantName,
  type UploadFailureReason,
  type UploadPurpose,
} from '@supporters/shared';
import sharp, { type Metadata } from 'sharp';
import type { Env } from '../../config/env';

/** The upload cannot be used, and trying again will not help. The reason goes to the client. */
export class MediaRejectedError extends Error {
  constructor(readonly reason: UploadFailureReason) {
    super(`media rejected: ${reason}`);
    this.name = 'MediaRejectedError';
  }
}

export interface ImageToProcess {
  bytes: Uint8Array;
  /** The type the client declared (already matched against the magic bytes). */
  contentType: string;
  purpose: UploadPurpose;
}

/** One file to store for an upload, named after its size. */
export interface ProcessedImage {
  name: ImageVariantName;
  body: Buffer;
  contentType: string;
  /** File extension without the dot. */
  extension: string;
}

/**
 * Turns an uploaded image into the files that are stored and served (backend spec, Security:
 * Uploads). Pure: no storage, no database. Throws `MediaRejectedError` for an image that must be
 * refused, anything else for a failure that is worth retrying.
 */
export interface MediaProcessor {
  processImage(image: ImageToProcess): Promise<ProcessedImage[]>;
}

interface VariantPlan {
  name: ImageVariantName;
  /** Longest side, or the side of the square for `crop`. Never enlarged. */
  px: number;
  /** Square, centred on the most interesting area, instead of fitting inside the box. */
  isSquare?: boolean;
  quality: number;
}

const FIT = (thumb: number, card: number, full: number): VariantPlan[] => [
  { name: 'thumb', px: thumb, quality: 75 },
  { name: 'card', px: card, quality: 80 },
  { name: 'full', px: full, quality: 82 },
];

/**
 * What is stored per purpose. Listing, post and requirement images get the three sizes of the
 * product spec (longest side 320, 720 and 1600 px). Avatars are square crops, since they are
 * shown in circles and squares. Covers keep their shape and are sized by width, as they are
 * shown wide. Chat images and KYC documents are never public, so they get one re-encoded file:
 * chat at most 1600 px; KYC at most 3000 px and higher quality, so small print stays legible.
 */
export const VARIANT_PLANS: Record<UploadPurpose, VariantPlan[]> = {
  listing: FIT(IMAGE_VARIANT_PX.thumb, IMAGE_VARIANT_PX.card, IMAGE_VARIANT_PX.full),
  post: FIT(IMAGE_VARIANT_PX.thumb, IMAGE_VARIANT_PX.card, IMAGE_VARIANT_PX.full),
  requirement: FIT(IMAGE_VARIANT_PX.thumb, IMAGE_VARIANT_PX.card, IMAGE_VARIANT_PX.full),
  cover: FIT(480, 960, 1920),
  avatar: [
    { name: 'thumb', px: 96, isSquare: true, quality: 80 },
    { name: 'card', px: 320, isSquare: true, quality: 80 },
    { name: 'full', px: 640, isSquare: true, quality: 82 },
  ],
  chat: [{ name: 'full', px: IMAGE_VARIANT_PX.full, quality: 80 }],
  kyc: [{ name: 'full', px: 3000, quality: 90 }],
};

/** The formats sharp is asked to decode, whatever the declared type was. */
const DECODABLE = new Set(['jpeg', 'png', 'webp']);

/** An APNG announces itself with an `acTL` chunk before the first image data. */
function isAnimatedPng(bytes: Uint8Array): boolean {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 8;
  while (offset + 8 <= bytes.length) {
    const length = view.getUint32(offset);
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (type === 'acTL') return true;
    if (type === 'IDAT' || type === 'IEND') return false;
    offset += 12 + length;
  }
  return false;
}

function classify(error: unknown): MediaRejectedError {
  const message = error instanceof Error ? error.message : String(error);
  if (/pixel limit|too large/i.test(message)) return new MediaRejectedError('too_large_dimensions');
  if (/timeout|timed out|aborted/i.test(message)) return new MediaRejectedError('timeout');
  if (/unsupported (image )?format|codec|heif|compression format/i.test(message)) {
    return new MediaRejectedError('unsupported_format');
  }
  return new MediaRejectedError('corrupt');
}

sharp.cache(false);

/**
 * sharp (libvips) pipeline. Every image is decoded and encoded again, never copied through, so
 * nothing that was in the file survives except its pixels: EXIF (including GPS), XMP, IPTC, ICC
 * profiles, thumbnails, comments and any trailing bytes are all dropped, because sharp keeps no
 * metadata unless asked. The order is: read the header only, refuse by format, size and frame
 * count, then decode sequentially with a pixel limit and a timeout.
 */
export class SharpMediaProcessor implements MediaProcessor {
  async processImage({ bytes, contentType, purpose }: ImageToProcess): Promise<ProcessedImage[]> {
    // sharp's prebuilt libheif decodes AV1 (AVIF) but not HEVC, which is what phones write as
    // HEIC (HEVC is patent-encumbered), so HEIC is refused, always, with a message that says what
    // to do instead. Nothing is decoded.
    if (contentType === 'image/heic') throw new MediaRejectedError('heic_unsupported');
    const open = () =>
      sharp(bytes, {
        limitInputPixels: MEDIA_LIMITS.imageMaxPixels,
        sequentialRead: true,
        // Refuse a file libvips found errors in; benign warnings are fine.
        failOn: 'error',
        // First frame only; animated input is refused below, before any decode.
        animated: false,
      });

    let metadata: Metadata;
    try {
      metadata = await open().metadata();
    } catch (error) {
      throw classify(error);
    }
    if (metadata.format === 'heif') throw new MediaRejectedError('heic_unsupported');
    if (!DECODABLE.has(metadata.format)) {
      throw new MediaRejectedError('unsupported_format');
    }
    const { width, height } = metadata;
    // sharp's types say `pages` is always set; for a single image it is not.
    const pages: number | undefined = metadata.pages;
    if (
      width < 1 ||
      height < 1 ||
      width > MEDIA_LIMITS.imageMaxSidePx ||
      height > MEDIA_LIMITS.imageMaxSidePx ||
      width * height > MEDIA_LIMITS.imageMaxPixels
    ) {
      throw new MediaRejectedError('too_large_dimensions');
    }
    if ((pages ?? 1) > 1 || (metadata.format === 'png' && isAnimatedPng(bytes))) {
      throw new MediaRejectedError('animated');
    }

    try {
      const outputs: ProcessedImage[] = [];
      for (const plan of VARIANT_PLANS[purpose]) {
        // `rotate()` applies the EXIF orientation to the pixels; the tag itself is not written.
        let pipeline = open()
          .timeout({ seconds: MEDIA_LIMITS.imageProcessingTimeoutSec })
          .rotate()
          .toColourspace('srgb');
        if (plan.isSquare) {
          // Square crops only shrink: a small photo gives a smaller square, not a blurry one.
          const side = Math.min(plan.px, width, height);
          pipeline = pipeline.resize(side, side, { fit: 'cover', position: 'attention' });
        } else {
          pipeline = pipeline.resize(plan.px, plan.px, {
            fit: 'inside',
            withoutEnlargement: true,
          });
        }
        const body = await pipeline.webp({ quality: plan.quality, effort: 4 }).toBuffer();
        outputs.push({ name: plan.name, body, contentType: 'image/webp', extension: 'webp' });
      }
      return outputs;
    } catch (error) {
      throw classify(error);
    }
  }
}

/**
 * Keeps the file exactly as uploaded: no re-encode, so EXIF and GPS stay. For tests that only
 * need an upload to become `ready`; `assertDeployableMediaProcessor` keeps it out of staging and
 * production.
 */
export class PassthroughMediaProcessor implements MediaProcessor {
  async processImage({ bytes, contentType }: ImageToProcess): Promise<ProcessedImage[]> {
    const extension = contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin';
    return [{ name: 'full', body: Buffer.from(bytes), contentType, extension }];
  }
}

/** Processors that must never run where real users upload photos. */
export function assertDeployableMediaProcessor(
  env: Pick<Env, 'NODE_ENV'>,
  processor: MediaProcessor,
): void {
  const isDeployed = env.NODE_ENV === 'staging' || env.NODE_ENV === 'production';
  if (isDeployed && processor instanceof PassthroughMediaProcessor) {
    // Images would be served with their EXIF and GPS metadata.
    throw new Error(`Refusing to start in ${env.NODE_ENV} with the passthrough media processor`);
  }
}
