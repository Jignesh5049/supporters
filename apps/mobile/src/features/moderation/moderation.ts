import {
  MEDIA_LIMITS,
  VERIFICATION_LIMITS,
  submitVerificationSchema,
  type MyVerification,
  type ReportTargetType,
  UploadPurpose,
  type VerificationMethod,
} from '@supporters/shared';
import { create } from 'zustand';
import { ApiError, messageForError } from '../../lib/api/errors';
import type { ModerationApi } from '../../lib/api/moderation';
import type { UploadsApi } from '../../lib/api/uploads';

// Reports (product spec, Moderation) and verification (product spec, Verification).

export const REPORT_TARGET_NOUNS: Record<ReportTargetType, string> = {
  post: 'post',
  comment: 'comment',
  review: 'review',
  message: 'message',
  business: 'business',
  requirement: 'requirement',
};

interface ReportTarget {
  type: ReportTargetType;
  id: string;
}

interface ReportStore {
  target: ReportTarget | null;
  open: (type: ReportTargetType, id: string) => void;
  close: () => void;
}

/** The one report sheet, mounted in the root layout; any screen opens it with a target. */
export const useReportStore = create<ReportStore>((set) => ({
  target: null,
  open: (type, id) => set({ target: { type, id } }),
  close: () => set({ target: null }),
}));

export function reportErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return 'This is no longer available.';
    if (error.fieldErrors[0]?.path === 'body.targetId') return "You can't report your own content.";
  }
  return messageForError(error);
}

/** A file picked for verification: a PDF, JPEG or PNG up to 10 MB. */
export interface KycFile {
  uri: string;
  name: string;
  contentType: string;
  size: number | undefined;
}

const KYC_TYPES: readonly string[] = [...MEDIA_LIMITS.documentTypes, ...MEDIA_LIMITS.kycImageTypes];

/** Why a picked file can't be used, or null. */
export function kycFileProblem(
  file: Pick<KycFile, 'contentType' | 'size' | 'name'>,
): string | null {
  if (!KYC_TYPES.includes(file.contentType)) return `${file.name}: use a PDF, JPEG or PNG.`;
  const max = Math.max(MEDIA_LIMITS.documentMaxBytes, MEDIA_LIMITS.imageMaxBytes);
  if (file.size !== undefined && file.size > max) return `${file.name} is larger than 10 MB.`;
  return null;
}

export interface VerificationDraft {
  method: VerificationMethod;
  registrationNumber: string;
  certificate: KycFile | null;
  ownerIds: KycFile[];
}

const PLACEHOLDER_IDS = {
  certificateUploadId: '0199f4a0-0000-7000-8000-000000000001',
  ownerIdUploadIds: ['0199f4a0-0000-7000-8000-000000000002'],
};

/** The first thing to fix before anything is uploaded, or null. */
export function verificationDraftProblem(draft: VerificationDraft): string | null {
  const number = submitVerificationSchema.safeParse({
    method: draft.method,
    registrationNumber: draft.registrationNumber,
    ...PLACEHOLDER_IDS,
  });
  if (!number.success) return number.error.issues[0]?.message ?? 'Check the number';
  if (!draft.certificate) return 'Add the certificate';
  const { min, max } = VERIFICATION_LIMITS.ownerIdFiles;
  if (draft.ownerIds.length < min) return 'Add your photo ID';
  if (draft.ownerIds.length > max) return `Add at most ${max} photo ID files (front and back)`;
  for (const file of [draft.certificate, ...draft.ownerIds]) {
    const problem = kycFileProblem(file);
    if (problem) return problem;
  }
  return null;
}

export function verificationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'VERIFICATION_PENDING') return 'Your request is already in review.';
    if (error.code === 'ALREADY_VERIFIED') return 'Your business is already verified.';
    if (error.fieldErrors[0]) return error.fieldErrors[0].message;
  }
  return messageForError(error);
}

/** Uploads each file as a private `kyc` upload, then opens the request. */
export async function submitVerification(
  draft: VerificationDraft,
  deps: {
    uploads: Pick<UploadsApi, 'uploadFile'>;
    submit: ModerationApi['submitVerification'];
  },
): Promise<MyVerification> {
  if (!draft.certificate) throw new Error('Add the certificate');
  const upload = async (file: KycFile) =>
    (await deps.uploads.uploadFile(file.uri, file.contentType, UploadPurpose.Kyc)).id;
  const certificateUploadId = await upload(draft.certificate);
  const ownerIdUploadIds: string[] = [];
  for (const file of draft.ownerIds) ownerIdUploadIds.push(await upload(file));
  return deps.submit({
    method: draft.method,
    registrationNumber: draft.registrationNumber,
    certificateUploadId,
    ownerIdUploadIds,
  });
}
