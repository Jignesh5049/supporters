import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type TestAdmin, adminBrowser, enrolAdmin } from '../../test/admin';
import { type ReferenceData, call, referenceData, signUpOwner } from '../../test/catalog';
import {
  type Browser,
  type MobileSession,
  type TestContext,
  createTestApp,
  prisma,
  registerMobile,
  resetState,
} from '../../test/helpers';
import { drainOutbox, inboxOf, outboxOf } from '../../test/notifications';
import { ownerWithPost } from '../../test/social';

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

let admin: TestAdmin;
let browser: Browser;

beforeEach(async () => {
  admin = await enrolAdmin();
  browser = await adminBrowser(ctx, admin);
});

const get = (url: string) => browser.request({ method: 'GET', url });
const post = (url: string, body?: object) =>
  browser.request({ method: 'POST', url, ...(body ? { body } : {}) });

async function kycUpload(userId: string, contentType = 'application/pdf') {
  const upload = await prisma.upload.create({
    data: {
      userId,
      purpose: 'kyc',
      key: `kyc/${randomUUID()}`,
      contentType,
      sizeBytes: 2_048,
      status: 'ready',
    },
  });
  return upload.id;
}

/** An owner with a pending verification request, sent through the API. */
async function pendingRequest() {
  const { session: owner, business } = await signUpOwner(ctx, refs);
  const response = await call(ctx, 'POST', '/v1/me/business/verification', {
    as: owner,
    body: {
      method: 'gstin',
      registrationNumber: '27AAPFU0939F1ZV',
      certificateUploadId: await kycUpload(owner.user.id),
      ownerIdUploadIds: [await kycUpload(owner.user.id, 'image/jpeg')],
    },
  });
  if (response.statusCode !== 201) throw new Error(response.body);
  return { owner, business, id: response.json<{ request: { id: string } }>().request.id };
}

describe('admin verifications', () => {
  it('lists pending requests oldest first, with the business and its documents', async () => {
    const first = await pendingRequest();
    const second = await pendingRequest();
    const response = await get('/v1/admin/verifications');
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const data = response.json().data;
    expect(data.map((row: { id: string }) => row.id)).toEqual([first.id, second.id]);
    expect(data[0]).toMatchObject({
      status: 'pending',
      registrationNumber: '27AAPFU0939F1ZV',
      business: { id: first.business.id, verificationStatus: 'pending', city: 'Mumbai' },
      owner: { id: first.owner.user.id },
      reviewer: null,
    });
    expect(data[0].documents.map((doc: { kind: string }) => doc.kind)).toEqual([
      'certificate',
      'owner_id',
    ]);
    expect((await get('/v1/admin/verifications?status=approved')).json().data).toEqual([]);
  });

  it('opens each document through an audited 5-minute link', async () => {
    const { id } = await pendingRequest();
    const [row] = (await get('/v1/admin/verifications')).json().data;
    const documentId = row.documents[0].id;
    const response = await get(`/v1/admin/verifications/${id}/documents/${documentId}`);
    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('no-store');
    const url = new URL(response.json().url);
    expect(url.pathname).toMatch(/\/kyc\//);
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'verification.document_view' },
    });
    expect(audit).toMatchObject({
      actorUserId: admin.userId,
      targetId: id,
      metadata: { documentId, kind: 'certificate' },
    });
    // A document of another request is not reachable through this one.
    const other = await pendingRequest();
    expect(
      (await get(`/v1/admin/verifications/${other.id}/documents/${documentId}`)).statusCode,
    ).toBe(404);
  });

  it('approves: the badge appears, the owner is told, and nobody can decide again', async () => {
    const { owner, business, id } = await pendingRequest();
    const approved = await post(`/v1/admin/verifications/${id}/approve`);
    expect(approved.statusCode).toBe(200);
    expect(approved.json()).toMatchObject({
      status: 'approved',
      reviewer: { id: admin.userId },
      business: { verificationStatus: 'verified' },
    });
    const page = await call(ctx, 'GET', `/v1/businesses/${business.slug}`);
    expect(page.json().isVerified).toBe(true);
    expect(
      (await prisma.business.findUniqueOrThrow({ where: { id: business.id } })).verifiedAt,
    ).not.toBeNull();

    expect((await post(`/v1/admin/verifications/${id}/approve`)).statusCode).toBe(409);
    const late = await post(`/v1/admin/verifications/${id}/reject`, {
      reason: 'Changed my mind about this',
    });
    expect(late.statusCode).toBe(409);

    expect(await outboxOf('business.verified')).toHaveLength(1);
    await drainOutbox();
    const [notice] = await inboxOf(owner.user.id);
    expect(notice).toMatchObject({
      type: 'business.verified',
      category: 'business',
      targetType: 'business',
      targetId: business.id,
    });
    expect(await prisma.auditLog.count({ where: { action: 'verification.approve' } })).toBe(1);
  });

  it('rejects with a reason the owner can read, then accepts a new request', async () => {
    const { owner, id } = await pendingRequest();
    expect(
      (await post(`/v1/admin/verifications/${id}/reject`, { reason: 'short' })).statusCode,
    ).toBe(400);
    const reason = 'The certificate photo is unreadable';
    const rejected = await post(`/v1/admin/verifications/${id}/reject`, { reason });
    expect(rejected.json()).toMatchObject({ status: 'rejected', rejectionReason: reason });

    const mine = await call(ctx, 'GET', '/v1/me/business/verification', { as: owner });
    expect(mine.json()).toMatchObject({
      status: 'rejected',
      request: { status: 'rejected', rejectionReason: reason },
    });
    expect(await outboxOf('business.verification_rejected')).toHaveLength(1);
    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { action: 'verification.reject' },
    });
    expect(audit.metadata).toMatchObject({ reason });
  });

  it('lets one of two racing decisions win', async () => {
    const { id } = await pendingRequest();
    const second = await adminBrowser(ctx, await enrolAdmin('Second Admin'));
    const [a, b] = await Promise.all([
      post(`/v1/admin/verifications/${id}/approve`),
      second.request({
        method: 'POST',
        url: `/v1/admin/verifications/${id}/reject`,
        body: { reason: 'Racing reject for the test' },
      }),
    ]);
    expect([a.statusCode, b.statusCode].sort()).toEqual([200, 409]);
    expect(
      (await prisma.auditLog.findMany({ where: { action: { startsWith: 'verification.' } } }))
        .length,
    ).toBe(1);
  });
});

describe('admin reports', () => {
  let owner: MobileSession;
  let postId: string;

  beforeEach(async () => {
    ({ session: owner, postId } = await ownerWithPost(ctx, refs));
  });

  async function reportPost(count: number) {
    const ids: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const reporter = await registerMobile(ctx);
      const response = await call(ctx, 'POST', '/v1/reports', {
        as: reporter,
        body: { targetType: 'post', targetId: postId, reason: 'spam' },
      });
      ids.push(response.json<{ id: string }>().id);
    }
    return ids;
  }

  it('lists open reports oldest first with a preview of the target', async () => {
    const [first] = await reportPost(2);
    const response = await get('/v1/admin/reports');
    const data = response.json().data;
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({
      id: first,
      targetType: 'post',
      targetId: postId,
      reason: 'spam',
      status: 'open',
      subject: { id: owner.user.id, status: 'active' },
      target: { excerpt: 'Fresh stock this week', isHidden: false, isDeleted: false, postId },
      openReportCount: 2,
    });
    expect((await get('/v1/admin/reports?targetType=comment')).json().data).toEqual([]);
  });

  it('dismisses every open report on the target and shows an auto-hidden post again', async () => {
    const [first] = await reportPost(5);
    expect((await call(ctx, 'GET', `/v1/posts/${postId}`)).statusCode).toBe(404);

    const response = await post(`/v1/admin/reports/${first}/action`, {
      action: 'dismiss',
      note: 'Not spam',
    });
    expect(response.json()).toEqual({
      resolvedCount: 5,
      isTargetHidden: false,
      subjectStatus: 'active',
    });
    expect((await call(ctx, 'GET', `/v1/posts/${postId}`)).statusCode).toBe(200);
    expect(await prisma.report.count({ where: { status: 'dismissed', action: 'dismiss' } })).toBe(
      5,
    );
    expect((await get('/v1/admin/reports')).json().data).toEqual([]);
    expect((await post(`/v1/admin/reports/${first}/action`, { action: 'hide' })).statusCode).toBe(
      409,
    );
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { action: 'report.dismiss' } });
    expect(audit.metadata).toMatchObject({
      targetType: 'post',
      targetId: postId,
      resolvedCount: 5,
    });
  });

  it('hides, and tells the author once', async () => {
    const [first] = await reportPost(1);
    const response = await post(`/v1/admin/reports/${first}/action`, { action: 'hide' });
    expect(response.json()).toMatchObject({ resolvedCount: 1, isTargetHidden: true });
    expect((await call(ctx, 'GET', `/v1/posts/${postId}`)).statusCode).toBe(404);
    expect(await outboxOf('content.hidden')).toHaveLength(1);
  });

  it('warns the author without touching the content', async () => {
    const [first] = await reportPost(1);
    const response = await post(`/v1/admin/reports/${first}/action`, { action: 'warn' });
    expect(response.json()).toMatchObject({ isTargetHidden: false, subjectStatus: 'active' });
    expect((await outboxOf('account.warned')).map((event) => event.payload)).toEqual([
      { userId: owner.user.id, reportId: first },
    ]);
    await drainOutbox();
    expect((await inboxOf(owner.user.id))[0]).toMatchObject({
      type: 'account.warned',
      category: 'account',
    });
  });

  it('suspends the author: content hidden, account suspended, sessions revoked', async () => {
    const [first] = await reportPost(1);
    const response = await post(`/v1/admin/reports/${first}/action`, { action: 'suspend' });
    expect(response.json()).toEqual({
      resolvedCount: 1,
      isTargetHidden: true,
      subjectStatus: 'suspended',
    });
    expect((await call(ctx, 'GET', '/v1/me', { as: owner })).statusCode).toBe(401);
    expect(await prisma.session.count({ where: { userId: owner.user.id, revokedAt: null } })).toBe(
      0,
    );
    expect(await prisma.auditLog.count({ where: { action: 'user.suspend' } })).toBe(1);
    expect(await prisma.auditLog.count({ where: { action: 'report.suspend' } })).toBe(1);
  });

  it('refuses to suspend an admin through a report', async () => {
    const [first] = await reportPost(1);
    await prisma.report.updateMany({ data: { subjectUserId: admin.userId } });
    expect(
      (await post(`/v1/admin/reports/${first}/action`, { action: 'suspend' })).statusCode,
    ).toBe(409);
    // Rolled back: the report stays open and the post visible.
    expect(await prisma.report.count({ where: { status: 'open' } })).toBe(1);
    expect((await call(ctx, 'GET', `/v1/posts/${postId}`)).statusCode).toBe(200);
  });
});

describe('admin categories', () => {
  // Categories are reference data that resetState keeps, so remove the ones these tests add.
  afterEach(async () => {
    await prisma.category.deleteMany({
      where: { slug: { startsWith: 'test-' }, parentId: { not: null } },
    });
    await prisma.category.deleteMany({ where: { slug: { startsWith: 'test-' } } });
  });

  it('lists every category with its usage, and edits are audited', async () => {
    const { business } = await signUpOwner(ctx, refs);
    const list = await get('/v1/admin/categories');
    const row = list
      .json()
      .data.find((category: { id: string }) => category.id === refs.category.id);
    expect(row.usage.businesses).toBe(1);
    expect(row.usage.subcategories).toBeGreaterThan(0);
    expect(business.id).toBeTruthy();

    const created = await post('/v1/admin/categories', {
      name: 'Packaging',
      slug: 'test-packaging',
    });
    expect(created.statusCode).toBe(201);
    const id = created.json().id;
    const sub = await post('/v1/admin/categories', {
      name: 'Corrugated boxes',
      slug: 'test-corrugated-boxes',
      parentId: id,
    });
    expect(sub.json()).toMatchObject({ parentId: id, isActive: true });
    const nested = await post('/v1/admin/categories', {
      name: 'Too deep',
      slug: 'test-too-deep',
      parentId: sub.json().id,
    });
    expect(nested.statusCode).toBe(400);
    const taken = await post('/v1/admin/categories', { name: 'Dup', slug: 'test-packaging' });
    expect(taken.json().errors[0].path).toBe('body.slug');

    const patched = await browser.request({
      method: 'PATCH',
      url: `/v1/admin/categories/${id}`,
      body: { name: 'Packaging and boxes', isActive: false },
    });
    expect(patched.json()).toMatchObject({ name: 'Packaging and boxes', isActive: false });
    const tree = await call(ctx, 'GET', '/v1/categories');
    expect(JSON.stringify(tree.json())).not.toContain('test-packaging');
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { action: 'category.update' } });
    expect(audit.metadata).toEqual({
      changes: {
        name: { from: 'Packaging', to: 'Packaging and boxes' },
        isActive: { from: true, to: false },
      },
    });
  });

  it('deletes only unused categories', async () => {
    await signUpOwner(ctx, refs);
    const used = await browser.request({
      method: 'DELETE',
      url: `/v1/admin/categories/${refs.category.id}`,
    });
    expect(used.statusCode).toBe(409);

    const id = (await post('/v1/admin/categories', { name: 'Spare', slug: 'test-spare' })).json()
      .id;
    const removed = await browser.request({ method: 'DELETE', url: `/v1/admin/categories/${id}` });
    expect(removed.statusCode).toBe(204);
    expect(await prisma.category.findUnique({ where: { id } })).toBeNull();
    expect(await prisma.auditLog.count({ where: { action: 'category.delete' } })).toBe(1);
  });
});
