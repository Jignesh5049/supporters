import type {
  MyVerification,
  SubmitVerificationInput,
  VerificationRequest,
} from '@supporters/shared';
import type { BusinessVerification, PrismaClient } from '../../generated/prisma/client';
import { AppError, ErrorCode, invalidField, isUniqueViolation } from '../../lib/errors';
import type { BusinessesService } from '../businesses/businesses.service';
import type { UploadsService } from '../uploads/uploads.service';

const pending = () =>
  new AppError(409, ErrorCode.VerificationPending, 'Verification is already in review', {
    detail: 'An admin will decide on your current request first.',
  });
const alreadyVerified = () =>
  new AppError(409, ErrorCode.AlreadyVerified, 'Your business is already verified');
const filesInUse = () =>
  invalidField('body.certificateUploadId', 'A file was already sent with another request');

export const toVerificationRequest = (row: BusinessVerification): VerificationRequest => ({
  id: row.id,
  method: row.method,
  registrationNumber: row.registrationNumber,
  status: row.status,
  rejectionReason: row.rejectionReason,
  submittedAt: row.createdAt.toISOString(),
  reviewedAt: row.reviewedAt?.toISOString() ?? null,
});

/**
 * The owner's side of verification (product spec, "Verification"): send a
 * certificate and photo ID, then wait for an admin. The documents are private
 * `kyc` uploads; only admins open them, through 5-minute links.
 */
export class VerificationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly businesses: BusinessesService,
    private readonly uploads: UploadsService,
  ) {}

  async getMine(userId: string): Promise<MyVerification> {
    const business = await this.businesses.requireOwned(userId);
    const [row, latest] = await Promise.all([
      this.prisma.business.findUniqueOrThrow({
        where: { id: business.id },
        select: { verificationStatus: true },
      }),
      this.prisma.businessVerification.findFirst({
        where: { businessId: business.id },
        orderBy: { id: 'desc' },
      }),
    ]);
    return {
      status: row.verificationStatus,
      request: latest ? toVerificationRequest(latest) : null,
    };
  }

  /**
   * Opens a request. Allowed with no badge or after a rejection; a pending or
   * verified business gets a 409. The business moves to `pending` in the same
   * transaction, guarded by its current status, and a partial unique index
   * allows one pending request per business, so concurrent submits make one.
   */
  async submit(userId: string, input: SubmitVerificationInput): Promise<MyVerification> {
    const business = await this.businesses.requireOwned(userId);
    const current = await this.prisma.business.findUniqueOrThrow({
      where: { id: business.id },
      select: { verificationStatus: true },
    });
    if (current.verificationStatus === 'pending') throw pending();
    if (current.verificationStatus === 'verified') throw alreadyVerified();

    // Ownership, purpose and readiness are part of the lookup: another user's file is unknown.
    await this.uploads.requireReady(
      userId,
      [input.certificateUploadId],
      'kyc',
      'body.certificateUploadId',
    );
    await this.uploads.requireReady(userId, input.ownerIdUploadIds, 'kyc', 'body.ownerIdUploadIds');
    const documents = [
      { uploadId: input.certificateUploadId, kind: 'certificate' as const },
      ...input.ownerIdUploadIds.map((uploadId) => ({ uploadId, kind: 'owner_id' as const })),
    ];
    const reused = await this.prisma.verificationDocument.findFirst({
      where: { uploadId: { in: documents.map((document) => document.uploadId) } },
      select: { id: true },
    });
    if (reused) throw filesInUse();

    try {
      await this.prisma.$transaction(async (tx) => {
        const { count } = await tx.business.updateMany({
          where: { id: business.id, verificationStatus: { in: ['none', 'rejected'] } },
          data: { verificationStatus: 'pending' },
        });
        if (count === 0) throw pending();
        await tx.businessVerification.create({
          data: {
            businessId: business.id,
            method: input.method,
            registrationNumber: input.registrationNumber,
            documents: {
              create: documents.map((document, position) => ({ ...document, position })),
            },
          },
        });
      });
    } catch (error) {
      // A racing second submit (one pending request per business), or a file it also used.
      if (isUniqueViolation(error)) throw pending();
      throw error;
    }
    return this.getMine(userId);
  }
}
