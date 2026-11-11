import {
  type AdminVerification,
  type AdminVerificationsQuery,
  type DocumentLink,
  MEDIA_LIMITS,
  type Page,
  type RejectVerificationInput,
} from '@supporters/shared';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { AppError, ErrorCode, notFound } from '../../lib/errors';
import { recordEvent } from '../notifications/outbox';
import { recordSearchSync } from '../search/search.sync';
import type { ObjectStorage } from '../uploads/storage';
import { type AdminActor, writeAudit } from './audit.service';
import { splitPage } from '../../lib/pagination';
import { queuePageArgs } from './queue-pagination';

const include = {
  business: {
    select: {
      id: true,
      name: true,
      slug: true,
      gstin: true,
      verificationStatus: true,
      city: { select: { name: true } },
      owner: { select: { id: true, name: true } },
    },
  },
  reviewer: { select: { id: true, name: true } },
  documents: {
    orderBy: { position: 'asc' },
    select: { id: true, kind: true, upload: { select: { contentType: true, sizeBytes: true } } },
  },
} satisfies Prisma.BusinessVerificationInclude;
type Row = Prisma.BusinessVerificationGetPayload<{ include: typeof include }>;

const notPending = () =>
  new AppError(409, ErrorCode.Conflict, 'This request was already decided', {
    detail: 'Reload the queue.',
  });

function toAdminVerification(row: Row): AdminVerification {
  const { business } = row;
  return {
    id: row.id,
    method: row.method,
    registrationNumber: row.registrationNumber,
    status: row.status,
    rejectionReason: row.rejectionReason,
    submittedAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewer: row.reviewer,
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      gstin: business.gstin,
      city: business.city.name,
      verificationStatus: business.verificationStatus,
    },
    owner: business.owner,
    documents: row.documents.map((document) => ({
      id: document.id,
      kind: document.kind,
      contentType: document.upload.contentType,
      size: document.upload.sizeBytes,
    })),
  };
}

/** The verification queue (product spec, Verification): approve or reject with a reason. */
export class AdminVerificationsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly storage: ObjectStorage,
  ) {}

  /** Pending requests oldest first (decide within 2 working days); decided ones newest first. */
  async list(query: AdminVerificationsQuery): Promise<Page<AdminVerification>> {
    const isQueue = query.status === 'pending';
    const page = queuePageArgs(query.cursor, query.limit, isQueue ? 'asc' : 'desc');
    const rows = await this.prisma.businessVerification.findMany({
      ...page,
      where: { ...page.where, status: query.status },
      include,
    });
    const split = splitPage(rows, query.limit);
    return { data: split.rows.map(toAdminVerification), nextCursor: split.nextCursor };
  }

  /**
   * A 5-minute presigned GET link for one KYC document (backend spec, Uploads),
   * audit-logged with who opened what. Images open inline, PDFs download.
   */
  async documentLink(
    actor: AdminActor,
    verificationId: string,
    documentId: string,
  ): Promise<DocumentLink> {
    const document = await this.prisma.verificationDocument.findFirst({
      where: { id: documentId, verificationId, upload: { purpose: 'kyc' } },
      select: { kind: true, upload: { select: { key: true, contentType: true } } },
    });
    if (!document) throw notFound();
    const ttlSec = MEDIA_LIMITS.signedGetTtlSec;
    await writeAudit(this.prisma, actor, {
      action: 'verification.document_view',
      targetType: 'verification',
      targetId: verificationId,
      metadata: { documentId, kind: document.kind },
    });
    const url = await this.storage.presignGet(document.upload.key, ttlSec, {
      contentType: document.upload.contentType,
    });
    return { url, expiresAt: new Date(Date.now() + ttlSec * 1000).toISOString() };
  }

  /** Grants the badge; the slug locks for good on the first verification. */
  async approve(actor: AdminActor, id: string): Promise<AdminVerification> {
    return this.decide(actor, id, async (tx, row, now) => {
      await tx.business.update({
        where: { id: row.businessId },
        data: { verificationStatus: 'verified', verifiedAt: row.business.verifiedAt ?? now },
      });
      await recordEvent(tx, 'business.verified', { verificationId: id });
      await recordSearchSync(tx, 'business', row.businessId);
      await writeAudit(tx, actor, {
        action: 'verification.approve',
        targetType: 'verification',
        targetId: id,
        metadata: { businessId: row.businessId },
      });
      return { status: 'approved', rejectionReason: null };
    });
  }

  async reject(
    actor: AdminActor,
    id: string,
    input: RejectVerificationInput,
  ): Promise<AdminVerification> {
    return this.decide(actor, id, async (tx, row) => {
      await tx.business.update({
        where: { id: row.businessId },
        data: { verificationStatus: 'rejected' },
      });
      await recordEvent(tx, 'business.verification_rejected', { verificationId: id });
      await recordSearchSync(tx, 'business', row.businessId);
      await writeAudit(tx, actor, {
        action: 'verification.reject',
        targetType: 'verification',
        targetId: id,
        metadata: { businessId: row.businessId, reason: input.reason },
      });
      return { status: 'rejected', rejectionReason: input.reason };
    });
  }

  /**
   * Locks the request, checks it is still pending, applies the decision and
   * records it, all in one transaction, so two admins can't both decide.
   */
  private async decide(
    actor: AdminActor,
    id: string,
    apply: (
      tx: Prisma.TransactionClient,
      row: { businessId: string; business: { verifiedAt: Date | null } },
      now: Date,
    ) => Promise<{ status: 'approved' | 'rejected'; rejectionReason: string | null }>,
  ): Promise<AdminVerification> {
    await this.prisma.$transaction(async (tx) => {
      const [locked] = await tx.$queryRaw<{ status: string }[]>`
        SELECT status::text AS status FROM business_verifications WHERE id = ${id}::uuid FOR UPDATE`;
      if (!locked) throw notFound();
      if (locked.status !== 'pending') throw notPending();
      const row = await tx.businessVerification.findUniqueOrThrow({
        where: { id },
        select: { businessId: true, business: { select: { verifiedAt: true } } },
      });
      const now = new Date();
      const decision = await apply(tx, row, now);
      await tx.businessVerification.update({
        where: { id },
        data: { ...decision, reviewedByUserId: actor.userId, reviewedAt: now },
      });
    });
    return toAdminVerification(
      await this.prisma.businessVerification.findUniqueOrThrow({ where: { id }, include }),
    );
  }
}
