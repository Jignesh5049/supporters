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

export const UploadStatus = { Pending: 'pending', Ready: 'ready', Rejected: 'rejected' } as const;

export const uploadSchema = z.object({
  id: z.uuid(),
  purpose: uploadPurposeSchema,
  status: z.enum(Object.values(UploadStatus)),
  contentType: z.string(),
  size: z.number().int(),
  /** Public media only (avatars, covers, listing and post media); chat and KYC files have none. */
  url: z.url().nullable(),
});
export type Upload = z.infer<typeof uploadSchema>;

/** An image attached to a listing or business. */
export const mediaSchema = z.object({ id: z.uuid(), url: z.url() });
export type Media = z.infer<typeof mediaSchema>;
