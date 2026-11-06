import { z } from 'zod';
import { VERIFICATION_LIMITS } from '../limits';
import { VerificationStatus, gstinSchema } from './business';

// Business verification (product spec, "Verification (free, separate from Premium)").

/** Which government registration the owner proves the business with. */
export const VerificationMethod = { Gstin: 'gstin', Udyam: 'udyam' } as const;
export type VerificationMethod = (typeof VerificationMethod)[keyof typeof VerificationMethod];
export const verificationMethodSchema = z.enum(Object.values(VerificationMethod));

/** One request's state. The business's own `verificationStatus` is the badge. */
export const VerificationRequestStatus = {
  Pending: 'pending',
  Approved: 'approved',
  Rejected: 'rejected',
} as const;
export type VerificationRequestStatus =
  (typeof VerificationRequestStatus)[keyof typeof VerificationRequestStatus];
export const verificationRequestStatusSchema = z.enum(Object.values(VerificationRequestStatus));

export const VerificationDocumentKind = {
  /** The GST registration certificate or the Udyam registration certificate. */
  Certificate: 'certificate',
  /** The owner's photo ID. */
  OwnerId: 'owner_id',
} as const;
export type VerificationDocumentKind =
  (typeof VerificationDocumentKind)[keyof typeof VerificationDocumentKind];
export const verificationDocumentKindSchema = z.enum(Object.values(VerificationDocumentKind));

/** `UDYAM-MH-01-0000001`: state, district and serial (MSME Udyam registration). */
export const udyamNumberSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/, 'Enter a valid Udyam number'));

/**
 * The documents are `kyc` uploads (`POST /uploads/presign` with purpose `kyc`,
 * then complete): one certificate and one or two images of the owner's ID.
 */
export const submitVerificationSchema = z
  .strictObject({
    method: verificationMethodSchema,
    /** The GSTIN or the Udyam number, checked by an admin on the government portal. */
    registrationNumber: z.string().max(40),
    certificateUploadId: z.uuid(),
    ownerIdUploadIds: z
      .array(z.uuid())
      .min(VERIFICATION_LIMITS.ownerIdFiles.min)
      .max(VERIFICATION_LIMITS.ownerIdFiles.max),
  })
  .transform((input, ctx) => {
    const isGstin = input.method === VerificationMethod.Gstin;
    const number = (isGstin ? gstinSchema : udyamNumberSchema).safeParse(input.registrationNumber);
    if (!number.success) {
      ctx.addIssue({
        code: 'custom',
        path: ['registrationNumber'],
        message: isGstin ? 'Enter a valid GSTIN' : 'Enter a valid Udyam number',
      });
      return z.NEVER;
    }
    const ids = [input.certificateUploadId, ...input.ownerIdUploadIds];
    if (new Set(ids).size !== ids.length) {
      ctx.addIssue({
        code: 'custom',
        path: ['ownerIdUploadIds'],
        message: 'Each file may appear once',
      });
      return z.NEVER;
    }
    return { ...input, registrationNumber: number.data };
  });
export type SubmitVerificationInput = z.infer<typeof submitVerificationSchema>;

export const verificationRequestSchema = z.object({
  id: z.uuid(),
  method: verificationMethodSchema,
  registrationNumber: z.string(),
  status: verificationRequestStatusSchema,
  /** Set when rejected; shown to the owner. */
  rejectionReason: z.string().nullable(),
  submittedAt: z.iso.datetime(),
  reviewedAt: z.iso.datetime().nullable(),
});
export type VerificationRequest = z.infer<typeof verificationRequestSchema>;

/** `GET /me/business/verification`: the badge state and the latest request, if any. */
export const myVerificationSchema = z.object({
  status: z.enum(Object.values(VerificationStatus)),
  request: verificationRequestSchema.nullable(),
});
export type MyVerification = z.infer<typeof myVerificationSchema>;
