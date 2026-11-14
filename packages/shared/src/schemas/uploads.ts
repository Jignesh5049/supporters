import { z } from 'zod';
import { MEDIA_LIMITS } from '../limits';

/** What an upload is for; decides the allowed types, size cap and storage prefix. */
export const UploadPurpose = {
  Avatar: 'avatar',
  Cover: 'cover',
  Listing: 'listing',
  Post: 'post',
  Chat: 'chat',
  Kyc: 'kyc',
  /** Up to 3 images on a buyer requirement; public, like post media. */
  Requirement: 'requirement',
} as const;
export type UploadPurpose = (typeof UploadPurpose)[keyof typeof UploadPurpose];
export const uploadPurposeSchema = z.enum(Object.values(UploadPurpose));

const images = MEDIA_LIMITS.imageTypes.map((type) => [type, MEDIA_LIMITS.imageMaxBytes] as const);
const videos = MEDIA_LIMITS.videoTypes.map((type) => [type, MEDIA_LIMITS.videoMaxBytes] as const);
const documents = MEDIA_LIMITS.documentTypes.map(
  (type) => [type, MEDIA_LIMITS.documentMaxBytes] as const,
);
const kycImages = MEDIA_LIMITS.kycImageTypes.map(
  (type) => [type, MEDIA_LIMITS.imageMaxBytes] as const,
);

/** Allowed content types per purpose, each with its size cap in bytes (backend spec, Limits). */
export const UPLOAD_RULES: Record<UploadPurpose, ReadonlyMap<string, number>> = {
  avatar: new Map(images),
  cover: new Map(images),
  listing: new Map(images),
  post: new Map([...images, ...videos]),
  chat: new Map([...images, ...documents]),
  kyc: new Map([...kycImages, ...documents]),
  requirement: new Map(images),
};

export const presignUploadSchema = z
  .strictObject({
    purpose: uploadPurposeSchema,
    contentType: z.string().max(100),
    /** Exact size in bytes; the presigned URL only accepts a body of this length. */
    size: z.number().int().min(1),
  })
  .superRefine((input, ctx) => {
    const maxBytes = UPLOAD_RULES[input.purpose].get(input.contentType);
    if (maxBytes === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['contentType'],
        message: `Not allowed for ${input.purpose} uploads`,
      });
    } else if (input.size > maxBytes) {
      ctx.addIssue({
        code: 'too_big',
        origin: 'number',
        maximum: maxBytes,
        inclusive: true,
        path: ['size'],
        message: `Must be at most ${maxBytes} bytes`,
      });
    }
  });
export type PresignUploadInput = z.infer<typeof presignUploadSchema>;

/** PUT the file to `url` with exactly these headers, then call complete. */
export const presignedUploadSchema = z.object({
  id: z.uuid(),
  url: z.url(),
  method: z.literal('PUT'),
  headers: z.record(z.string(), z.string()),
  expiresAt: z.iso.datetime(),
});
export type PresignedUpload = z.infer<typeof presignedUploadSchema>;

/**
 * `pending` (waiting for the file) -> `processing` (the `media` job is running) -> `ready` or
 * `failed`. Only `ready` uploads can be attached to anything. `rejected` is what an upload that
 * failed validation was called before `processing` existed: no new upload gets it, and clients
 * treat it like `failed`.
 */
export const UploadStatus = {
  Pending: 'pending',
  Processing: 'processing',
  Ready: 'ready',
  Failed: 'failed',
  Rejected: 'rejected',
} as const;
export type UploadStatus = (typeof UploadStatus)[keyof typeof UploadStatus];

/** Why an upload ended up `failed`: stable codes for clients, each with a sentence for people. */
export const UPLOAD_FAILURE_MESSAGES = {
  content_mismatch: 'The file does not match the type or size it was declared with.',
  unsupported_format: 'This image format is not supported. Use a JPEG, PNG or WebP photo.',
  heic_unsupported: 'HEIC photos are not supported. Export the photo as JPEG or PNG and try again.',
  animated: 'Animated images are not supported. Use a still image.',
  too_large_dimensions: 'The image is too large (at most 40 megapixels and 12,000 px on a side).',
  corrupt: 'The file could not be read as an image.',
  timeout: 'The image took too long to process.',
  processing_error: 'The file could not be processed. Try uploading it again.',
} as const;
export type UploadFailureReason = keyof typeof UPLOAD_FAILURE_MESSAGES;
export const uploadFailureReasonSchema = z.enum(
  Object.keys(UPLOAD_FAILURE_MESSAGES) as [UploadFailureReason, ...UploadFailureReason[]],
);

export const IMAGE_VARIANT_NAMES = ['thumb', 'card', 'full'] as const;
export type ImageVariantName = (typeof IMAGE_VARIANT_NAMES)[number];

export const uploadSchema = z.object({
  id: z.uuid(),
  purpose: uploadPurposeSchema,
  status: z.enum(Object.values(UploadStatus)),
  contentType: z.string(),
  size: z.number().int(),
  /**
   * Public media only (avatars, covers, listing and post media); chat and KYC files have none.
   * For images this is the `full` variant.
   */
  url: z.url().nullable(),
  /** Public images once `ready`: the three sizes (`url` is `variants.full`). */
  variants: z.object({ thumb: z.url(), card: z.url(), full: z.url() }).nullable().optional(),
  /** Set when `status` is `failed`. */
  failureReason: uploadFailureReasonSchema.nullable().optional(),
  /** A sentence for the user, set together with `failureReason`. */
  failureMessage: z.string().nullable().optional(),
});
export type Upload = z.infer<typeof uploadSchema>;

/** False while the client should keep polling. */
export const isUploadSettled = (status: UploadStatus) =>
  status !== 'pending' && status !== 'processing';

/**
 * The URL of another size of a public image, given the URL the API returned (the `full` one).
 * Sizes live side by side as `<base>/thumb.webp`, `<base>/card.webp` and `<base>/full.webp`;
 * a URL that doesn't follow that layout is returned unchanged.
 */
export function imageVariantUrl(url: string, variant: ImageVariantName): string {
  return url.replace(/\/(?:thumb|card|full)\.webp$/, `/${variant}.webp`);
}

/** An image attached to a listing or business. */
export const mediaSchema = z.object({ id: z.uuid(), url: z.url() });
export type Media = z.infer<typeof mediaSchema>;
