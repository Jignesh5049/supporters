import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type TestAdmin, adminBrowser, enrolAdmin } from '../../test/admin';
import { type ReferenceData, call, referenceData, signUpOwner } from '../../test/catalog';
import {
  type Browser,
  PASSWORD,
  type TestContext,
  createTestApp,
  nextIp,
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

let admin: TestAdmin;
let browser: Browser;

beforeEach(async () => {
  admin = await enrolAdmin();
  browser = await adminBrowser(ctx, admin);
});

const get = (url: string) => browser.request({ method: 'GET', url });
const post = (url: string, body?: object) =>
  browser.request({ method: 'POST', url, ...(body ? { body } : {}) });

const REASON = 'Repeated scam messages to buyers';

describe('admin users', () => {
  it('lists accounts newest first with masked phones, and searches by name or number', async () => {
    const { session: owner, business } = await signUpOwner(ctx, refs);
    const buyer = await registerMobile(ctx);
    await prisma.user.update({ where: { id: buyer.user.id }, data: { name: 'Ravi Kumar' } });

    const all = await get('/v1/admin/users');
    expect(all.statusCode).toBe(200);
    const ids = all.json().data.map((user: { id: string }) => user.id);
    expect(ids.slice(0, 3)).toEqual([buyer.user.id, owner.user.id, admin.userId]);
    const ownerRow = all.json().data[1];
    expect(ownerRow).toMatchObject({
      role: 'user',
      status: 'active',
      business: { id: business.id, slug: business.slug },
      openReportCount: 0,
    });
    expect(ownerRow.phone).toBe(`+91******${owner.phone.slice(-4)}`);
    expect(JSON.stringify(all.json())).not.toContain(owner.phone);

    const byName = await get('/v1/admin/users?q=ravi');
    expect(byName.json().data.map((user: { id: string }) => user.id)).toEqual([buyer.user.id]);
    const byPhone = await get(`/v1/admin/users?q=${encodeURIComponent(owner.phone)}`);
    expect(byPhone.json().data.map((user: { id: string }) => user.id)).toEqual([owner.user.id]);
  });

  it('suspends an account: signs it out at once, refuses sign-in, hides its business', async () => {
    const { session: owner, business } = await signUpOwner(ctx, refs);
    expect((await call(ctx, 'GET', '/v1/me', { as: owner })).statusCode).toBe(200);

    const response = await post(`/v1/admin/users/${owner.user.id}/suspend`, { reason: REASON });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ id: owner.user.id, status: 'suspended' });

    // The live access token is refused immediately, and the refresh token is dead.
    expect((await call(ctx, 'GET', '/v1/me', { as: owner })).statusCode).toBe(401);
    const refresh = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/refresh',
      headers: { 'x-client': 'mobile' },
      payload: { refreshToken: owner.refreshToken },
      remoteAddress: nextIp(),
    });
    expect(refresh.statusCode).toBe(401);
    expect(await prisma.session.count({ where: { userId: owner.user.id, revokedAt: null } })).toBe(
      0,
    );
    const login = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      headers: { 'x-client': 'mobile' },
      payload: { identifier: owner.phone, password: PASSWORD },
      remoteAddress: nextIp(),
    });
    expect(login.statusCode).toBe(403);
    expect(problemCode(login)).toBe('ACCOUNT_SUSPENDED');
    expect((await call(ctx, 'GET', `/v1/businesses/${business.slug}`)).statusCode).toBe(404);

    // Search is told to drop the business, and to bring it back on restore.
    expect(
      (await prisma.outboxEvent.findMany({ where: { type: 'search.sync' } })).map((e) => e.payload),
    ).toEqual(expect.arrayContaining([{ entity: 'business', id: business.id }]));

    // Repeating changes nothing and records nothing more.
    expect(
      (await post(`/v1/admin/users/${owner.user.id}/suspend`, { reason: REASON })).statusCode,
    ).toBe(200);
    const audits = await prisma.auditLog.findMany({ where: { action: 'user.suspend' } });
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      actorUserId: admin.userId,
      targetType: 'user',
      targetId: owner.user.id,
      metadata: { reason: REASON },
    });

    const restored = await post(`/v1/admin/users/${owner.user.id}/restore`);
    expect(restored.json()).toEqual({ id: owner.user.id, status: 'active' });
    const again = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      headers: { 'x-client': 'mobile' },
      payload: { identifier: owner.phone, password: PASSWORD },
      remoteAddress: nextIp(),
    });
    expect(again.statusCode).toBe(200);
    expect(await prisma.auditLog.count({ where: { action: 'user.restore' } })).toBe(1);
  });

  it('refuses to suspend an admin, an unknown account or without a reason', async () => {
    const other = await enrolAdmin('Second Admin');
    const adminTarget = await post(`/v1/admin/users/${other.userId}/suspend`, { reason: REASON });
    expect(adminTarget.statusCode).toBe(409);
    expect(
      (await post(`/v1/admin/users/${admin.userId}/suspend`, { reason: REASON })).statusCode,
    ).toBe(409);
    const unknown = await post(`/v1/admin/users/${crypto.randomUUID()}/suspend`, {
      reason: REASON,
    });
    expect(unknown.statusCode).toBe(404);
    const user = await registerMobile(ctx);
    expect(
      (await post(`/v1/admin/users/${user.user.id}/suspend`, { reason: 'bad' })).statusCode,
    ).toBe(400);
    expect((await post(`/v1/admin/users/${user.user.id}/suspend`)).statusCode).toBe(400);
    expect(await prisma.auditLog.count({ where: { action: 'user.suspend' } })).toBe(0);
  });
});

describe('audit logs', () => {
  it('records admin reads and lists entries newest first with filters', async () => {
    const user = await registerMobile(ctx);
    await post(`/v1/admin/users/${user.user.id}/suspend`, { reason: REASON });
    await get('/v1/admin/users?q=nobody');

    const page = await get('/v1/admin/audit-logs');
    expect(page.statusCode).toBe(200);
    const actions = page.json().data.map((entry: { action: string }) => entry.action);
    expect(actions).toEqual(['admin.read', 'user.suspend', 'admin.login']);
    const [read] = page.json().data;
    expect(read).toMatchObject({
      actor: { id: admin.userId, name: 'Ops Admin' },
      metadata: { route: '/v1/admin/users', query: { q: 'nobody' }, status: 200 },
    });

    const filtered = await get(`/v1/admin/audit-logs?action=user.suspend&targetId=${user.user.id}`);
    expect(filtered.json().data).toHaveLength(1);
    // Reading the log is itself recorded.
    expect(await prisma.auditLog.count({ where: { action: 'admin.read' } })).toBe(3);
  });

  it('is append-only in the database', async () => {
    await expect(prisma.auditLog.updateMany({ data: { action: 'tampered' } })).rejects.toThrow(
      /append-only/,
    );
    await expect(prisma.auditLog.deleteMany()).rejects.toThrow(/append-only/);
    expect(await prisma.auditLog.count({ where: { action: 'admin.login' } })).toBe(1);
  });
});
