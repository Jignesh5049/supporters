import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  type ReferenceData,
  call,
  readyUpload,
  referenceData,
  signUpOwner,
} from '../../test/catalog';
import {
  type MobileSession,
  type TestContext,
  createTestApp,
  prisma,
  problemCode,
  registerMobile,
  resetState,
} from '../../test/helpers';

let ctx: TestContext;
let refs: ReferenceData;

beforeAll(async () => {
  ctx = await createTestApp();
  refs = await referenceData();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(resetState);

const GSTIN = '27AAPFU0939F1ZV';
const URL = '/v1/me/business/verification';

/** A `kyc` upload row, inserted directly (the presign and complete flow has its own tests). */
async function kycUpload(
  userId: string,
  overrides: { status?: 'ready' | 'pending'; purpose?: 'kyc' | 'chat' } = {},
) {
  const purpose = overrides.purpose ?? 'kyc';
  const upload = await prisma.upload.create({
    data: {
      userId,
      purpose,
      key: `${purpose}/${randomUUID()}`,
      contentType: 'application/pdf',
      sizeBytes: 2_048,
      status: overrides.status ?? 'ready',
    },
  });
  return upload.id;
}

async function submissionFor(userId: string, overrides: object = {}) {
  return {
    method: 'gstin',
    registrationNumber: GSTIN,
    certificateUploadId: await kycUpload(userId),
    ownerIdUploadIds: [await kycUpload(userId)],
    ...overrides,
  };
}

let owner: MobileSession;
let business: { id: string };

beforeEach(async () => {
  ({ session: owner, business } = await signUpOwner(ctx, refs));
});

describe('owner verification requests', () => {
  it('rejects guests and users without a business', async () => {
    expect((await call(ctx, 'GET', URL)).statusCode).toBe(401);
    expect((await call(ctx, 'POST', URL, { body: {} })).statusCode).toBe(401);
    const buyer = await registerMobile(ctx);
    const response = await call(ctx, 'POST', URL, {
      as: buyer,
      body: await submissionFor(buyer.user.id),
    });
    expect(response.statusCode).toBe(403);
    expect(problemCode(response)).toBe('BUSINESS_REQUIRED');
  });

  it('starts with no badge and no request', async () => {
    const response = await call(ctx, 'GET', URL, { as: owner });
    expect(response.json()).toEqual({ status: 'none', request: null });
  });

  it('opens a pending request and moves the business to pending', async () => {
    const body = await submissionFor(owner.user.id, {
      registrationNumber: ` ${GSTIN.toLowerCase()} `,
    });
    const response = await call(ctx, 'POST', URL, { as: owner, body });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      status: 'pending',
      request: {
        id: expect.any(String),
        method: 'gstin',
        registrationNumber: GSTIN,
        status: 'pending',
        rejectionReason: null,
        submittedAt: expect.any(String),
        reviewedAt: null,
      },
    });
    const mine = await call(ctx, 'GET', '/v1/me/business', { as: owner });
    expect(mine.json().verificationStatus).toBe('pending');

    const documents = await prisma.verificationDocument.findMany({ orderBy: { position: 'asc' } });
    expect(documents.map((document) => [document.uploadId, document.kind])).toEqual([
      [body.certificateUploadId, 'certificate'],
      [body.ownerIdUploadIds[0], 'owner_id'],
    ]);

    const again = await call(ctx, 'POST', URL, {
      as: owner,
      body: await submissionFor(owner.user.id),
    });
    expect(again.statusCode).toBe(409);
    expect(problemCode(again)).toBe('VERIFICATION_PENDING');
  });

  it('accepts a Udyam number and up to two ID images', async () => {
    const response = await call(ctx, 'POST', URL, {
      as: owner,
      body: await submissionFor(owner.user.id, {
        method: 'udyam',
        registrationNumber: 'udyam-mh-01-0012345',
        ownerIdUploadIds: [await kycUpload(owner.user.id), await kycUpload(owner.user.id)],
      }),
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().request).toMatchObject({
      method: 'udyam',
      registrationNumber: 'UDYAM-MH-01-0012345',
    });
  });

  it('validates the number and the files', async () => {
    const other = await registerMobile(ctx);
    const cases: [object, string][] = [
      [{ registrationNumber: '27AAPFU0939F1ZX' }, 'body.registrationNumber'],
      [{ method: 'udyam', registrationNumber: GSTIN }, 'body.registrationNumber'],
      [{ ownerIdUploadIds: [] }, 'body.ownerIdUploadIds'],
      [{ certificateUploadId: await kycUpload(other.user.id) }, 'body.certificateUploadId'],
      [
        { certificateUploadId: await kycUpload(owner.user.id, { status: 'pending' }) },
        'body.certificateUploadId',
      ],
      [
        { ownerIdUploadIds: [await kycUpload(owner.user.id, { purpose: 'chat' })] },
        'body.ownerIdUploadIds',
      ],
      [{ certificateUploadId: await readyUpload(owner.user.id) }, 'body.certificateUploadId'],
    ];
    for (const [overrides, path] of cases) {
      const response = await call(ctx, 'POST', URL, {
        as: owner,
        body: await submissionFor(owner.user.id, overrides),
      });
      expect(response.statusCode, JSON.stringify(overrides)).toBe(400);
      expect(response.json().errors[0].path).toBe(path);
    }

    const same = await kycUpload(owner.user.id);
    const duplicate = await call(ctx, 'POST', URL, {
      as: owner,
      body: await submissionFor(owner.user.id, {
        certificateUploadId: same,
        ownerIdUploadIds: [same],
      }),
    });
    expect(duplicate.statusCode).toBe(400);
    expect(await prisma.businessVerification.count()).toBe(0);
  });

  it('allows a new request after a rejection, but not with the same files', async () => {
    const first = await submissionFor(owner.user.id);
    expect((await call(ctx, 'POST', URL, { as: owner, body: first })).statusCode).toBe(201);
    await prisma.businessVerification.updateMany({
      data: { status: 'rejected', rejectionReason: 'The certificate is unreadable' },
    });
    await prisma.business.update({
      where: { id: business.id },
      data: { verificationStatus: 'rejected' },
    });

    const rejected = await call(ctx, 'GET', URL, { as: owner });
    expect(rejected.json()).toMatchObject({
      status: 'rejected',
      request: { status: 'rejected', rejectionReason: 'The certificate is unreadable' },
    });

    const reused = await call(ctx, 'POST', URL, { as: owner, body: first });
    expect(reused.statusCode).toBe(400);

    const retry = await call(ctx, 'POST', URL, {
      as: owner,
      body: await submissionFor(owner.user.id),
    });
    expect(retry.statusCode).toBe(201);
    expect(retry.json().request.status).toBe('pending');
    expect(await prisma.businessVerification.count()).toBe(2);
  });

  it('refuses a request from a verified business', async () => {
    await prisma.business.update({
      where: { id: business.id },
      data: { verificationStatus: 'verified', verifiedAt: new Date() },
    });
    const response = await call(ctx, 'POST', URL, {
      as: owner,
      body: await submissionFor(owner.user.id),
    });
    expect(response.statusCode).toBe(409);
    expect(problemCode(response)).toBe('ALREADY_VERIFIED');
  });

  it('makes one request from concurrent submits', async () => {
    const bodies = await Promise.all([1, 2, 3, 4].map(() => submissionFor(owner.user.id)));
    const responses = await Promise.all(
      bodies.map((body) => call(ctx, 'POST', URL, { as: owner, body })),
    );
    const codes = responses.map((response) => response.statusCode).sort();
    expect(codes).toEqual([201, 409, 409, 409]);
    expect(await prisma.businessVerification.count()).toBe(1);
  });

  it("never shows one owner another's request", async () => {
    await call(ctx, 'POST', URL, { as: owner, body: await submissionFor(owner.user.id) });
    const { session: other } = await signUpOwner(ctx, refs, { name: 'Other Traders' });
    expect((await call(ctx, 'GET', URL, { as: other })).json()).toEqual({
      status: 'none',
      request: null,
    });
  });
});
