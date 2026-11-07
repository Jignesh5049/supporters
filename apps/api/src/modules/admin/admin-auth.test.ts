import { ADMIN_LIMITS, RATE_LIMITS } from '@supporters/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { codeAt, adminBrowser, enrolAdmin, freshCode } from '../../test/admin';
import { type ReferenceData, call, referenceData, signUpOwner } from '../../test/catalog';
import {
  Browser,
  PASSWORD,
  TEST_TOTP_KEY,
  type TestContext,
  createTestApp,
  nextPhone,
  prisma,
  problemCode,
  registerBrowser,
  registerMobile,
  resetState,
} from '../../test/helpers';
import { openSecret } from '../../lib/secret-box';
import { base32Decode } from '../../lib/totp';
import { createAdmin, resetAdminTotp } from './admin-accounts';
import { ADMIN_ROUTES } from './admin.routes';

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

const LOGIN = '/v1/admin/auth/login';

const signIn = (browser: Browser, body: object) =>
  browser.request({ method: 'POST', url: LOGIN, body });

describe('create-admin', () => {
  it('creates an admin whose TOTP secret is stored only encrypted', async () => {
    const admin = await enrolAdmin();
    const row = await prisma.user.findUniqueOrThrow({ where: { id: admin.userId } });
    expect(row.role).toBe('admin');
    expect(row.totpSecret).not.toBeNull();
    expect(Buffer.from(row.totpSecret ?? []).includes(admin.secret)).toBe(false);
    expect(openSecret(TEST_TOTP_KEY, row.totpSecret ?? new Uint8Array(), admin.userId)).toEqual(
      admin.secret,
    );
    // Bound to the account: the ciphertext does not open as someone else's.
    expect(openSecret(TEST_TOTP_KEY, row.totpSecret ?? new Uint8Array(), row.phone)).toBeNull();
  });

  it('refuses a taken phone and a weak password, and resets a secret', async () => {
    const { phone } = await registerBrowser(ctx);
    await expect(
      createAdmin(prisma, TEST_TOTP_KEY, { phone, name: 'Ops', password: PASSWORD }),
    ).rejects.toThrow('already exists');
    await expect(
      createAdmin(prisma, TEST_TOTP_KEY, { phone: nextPhone(), name: 'Ops', password: 'short' }),
    ).rejects.toThrow('Invalid password');
    await expect(resetAdminTotp(prisma, TEST_TOTP_KEY, phone)).rejects.toThrow('No admin');

    const admin = await enrolAdmin();
    const reset = await resetAdminTotp(prisma, TEST_TOTP_KEY, admin.phone);
    const newSecret = base32Decode(new URL(reset.otpauthUri).searchParams.get('secret') ?? '');
    expect(newSecret.equals(admin.secret)).toBe(false);
    // The old authenticator no longer works.
    const response = await signIn(new Browser(ctx.app), {
      identifier: admin.phone,
      password: PASSWORD,
      code: codeAt(admin),
    });
    expect(response.statusCode).toBe(401);
  });
});

describe('admin sign-in', () => {
  it('needs password plus TOTP and gives an 8-hour session with no refresh token', async () => {
    const admin = await enrolAdmin();
    const browser = new Browser(ctx.app);
    const response = await signIn(browser, {
      identifier: admin.phone,
      password: PASSWORD,
      code: freshCode(admin),
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ user: { id: admin.userId, role: 'admin' } });
    expect(response.headers['cache-control']).toBe('no-store');

    const cookies = response.cookies as { name: string; maxAge?: number; httpOnly?: boolean }[];
    expect(cookies.map((cookie) => cookie.name).sort()).toEqual(['__Host-at', '__Host-csrf']);
    expect(cookies.find((cookie) => cookie.name === '__Host-at')).toMatchObject({
      maxAge: ADMIN_LIMITS.sessionTtlSec,
      httpOnly: true,
    });
    const claims = ctx.app.accessTokens.verify(browser.cookies.get('__Host-at') ?? '');
    expect(claims).toMatchObject({ sub: admin.userId, role: 'admin', mfa: true });
    expect((claims?.exp ?? 0) - (claims?.iat ?? 0)).toBe(ADMIN_LIMITS.sessionTtlSec);

    const session = await prisma.session.findFirstOrThrow({ where: { userId: admin.userId } });
    expect(session.absoluteExpiresAt).toEqual(session.expiresAt);
    expect(session.expiresAt.getTime() - session.createdAt.getTime()).toBeCloseTo(
      ADMIN_LIMITS.sessionTtlSec * 1000,
      -4,
    );

    const me = await browser.request({ method: 'GET', url: '/v1/me' });
    expect(me.json()).toMatchObject({ id: admin.userId, role: 'admin' });
    // Nothing to refresh with.
    const refresh = await browser.request({ method: 'POST', url: '/v1/auth/refresh' });
    expect(refresh.statusCode).toBe(401);

    const [audit] = await prisma.auditLog.findMany({ where: { action: 'admin.login' } });
    expect(audit).toMatchObject({
      actorUserId: admin.userId,
      targetType: 'session',
      targetId: session.id,
      ip: browser.ip,
    });
  });

  it('refuses wrong, missing, stale and reused codes with one generic answer', async () => {
    const admin = await enrolAdmin();
    const base = { identifier: admin.phone, password: PASSWORD };
    const wrong = codeAt(admin) === '000000' ? '111111' : '000000';
    for (const code of [wrong, codeAt(admin, -3), codeAt(admin, 3)]) {
      const response = await signIn(new Browser(ctx.app), { ...base, code });
      expect(response.statusCode).toBe(401);
      expect(response.json().title).toBe('Incorrect sign-in details');
    }
    expect((await signIn(new Browser(ctx.app), base)).statusCode).toBe(400);
    expect((await signIn(new Browser(ctx.app), { ...base, code: '12345' })).statusCode).toBe(400);

    const code = freshCode(admin);
    expect((await signIn(new Browser(ctx.app), { ...base, code })).statusCode).toBe(200);
    const replay = await signIn(new Browser(ctx.app), { ...base, code });
    expect(replay.statusCode).toBe(401);

    const wrongPassword = await signIn(new Browser(ctx.app), {
      identifier: admin.phone,
      password: 'not the password at all',
      code: freshCode(admin),
    });
    expect(wrongPassword.json().title).toBe('Incorrect sign-in details');
    expect(await prisma.auditLog.count({ where: { action: 'admin.login' } })).toBe(1);
  });

  it('counts bad codes toward the account lockout', async () => {
    const admin = await enrolAdmin();
    const wrong = codeAt(admin) === '000000' ? '111111' : '000000';
    for (let i = 0; i < RATE_LIMITS.loginPerAccount.max; i += 1) {
      const response = await signIn(new Browser(ctx.app), {
        identifier: admin.phone,
        password: PASSWORD,
        code: wrong,
      });
      expect(response.statusCode).toBe(401);
    }
    const locked = await signIn(new Browser(ctx.app), {
      identifier: admin.phone,
      password: PASSWORD,
      code: freshCode(admin),
    });
    expect(locked.statusCode).toBe(429);
  });

  it('refuses users at the admin sign-in and admins at the user sign-in', async () => {
    const { phone } = await registerBrowser(ctx);
    const user = await signIn(new Browser(ctx.app), {
      identifier: phone,
      password: PASSWORD,
      code: '123456',
    });
    expect(user.statusCode).toBe(401);
    expect(user.json().title).toBe('Incorrect sign-in details');

    const admin = await enrolAdmin();
    const asUser = await new Browser(ctx.app).request({
      method: 'POST',
      url: '/v1/auth/login',
      body: { identifier: admin.phone, password: PASSWORD },
    });
    expect(asUser.statusCode).toBe(403);
    expect(problemCode(asUser)).toBe('MFA_REQUIRED');
  });

  it('replaces a user session cookie in the same browser', async () => {
    const { browser } = await registerBrowser(ctx);
    expect(browser.cookies.has('__Host-rt')).toBe(true);
    const admin = await enrolAdmin();
    const response = await signIn(browser, {
      identifier: admin.phone,
      password: PASSWORD,
      code: freshCode(admin),
    });
    expect(response.statusCode).toBe(200);
    expect(browser.cookies.has('__Host-rt')).toBe(false);
    expect((await browser.request({ method: 'GET', url: '/v1/me' })).json().role).toBe('admin');
  });
});

describe('admin guard', () => {
  /** Calls a route template with a non-UUID id, so only a passed guard reaches validation. */
  async function hit(
    route: string,
    as: { browser?: Browser; bearer?: string },
  ): Promise<{ status: number; code: string }> {
    const [method, url] = route.split(' ') as [string, string];
    const path = url.replaceAll(/:\w+/g, 'not-a-uuid');
    const options = { method: method as 'GET', url: path, body: {} };
    const response = as.browser
      ? await as.browser.request(method === 'GET' ? { method: 'GET', url: path } : options)
      : await ctx.app.inject({
          method: method as 'GET',
          url: path,
          headers: as.bearer ? { authorization: `Bearer ${as.bearer}` } : {},
          ...(method === 'GET' ? {} : { payload: {} }),
        });
    return { status: response.statusCode, code: problemCode(response) };
  }

  const guarded = () => [...ADMIN_ROUTES].filter((route) => route !== `POST ${LOGIN}`);

  it('registers every admin route behind the guard', () => {
    expect(guarded().length).toBeGreaterThanOrEqual(4);
    expect([...ADMIN_ROUTES]).toContain(`POST ${LOGIN}`);
  });

  it('answers 404 on every admin route to guests, users and business owners', async () => {
    const user = await registerMobile(ctx);
    const { session: owner } = await signUpOwner(ctx, refs);
    const { browser } = await registerBrowser(ctx);
    for (const route of guarded()) {
      for (const as of [
        {},
        { bearer: user.accessToken },
        { bearer: owner.accessToken },
        { browser },
      ]) {
        expect(await hit(route, as), `${route} as ${JSON.stringify(Object.keys(as))}`).toEqual({
          status: 404,
          code: 'NOT_FOUND',
        });
      }
    }
  });

  it('lets a signed-in admin through on every route', async () => {
    const browser = await adminBrowser(ctx, await enrolAdmin());
    for (const route of guarded()) {
      // Past the guard: validation (400) or the handler answers, never the guard's 404.
      expect((await hit(route, { browser })).code, route).not.toBe('NOT_FOUND');
    }
  });

  it('refuses admin tokens without TOTP, after expiry, logout or demotion', async () => {
    const admin = await enrolAdmin();
    const browser = await adminBrowser(ctx, admin);
    const session = await prisma.session.findFirstOrThrow({ where: { userId: admin.userId } });
    const ok = () => browser.request({ method: 'GET', url: '/v1/admin/users' });
    expect((await ok()).statusCode).toBe(200);

    // The same session with a token that never passed TOTP.
    const noMfa = ctx.app.accessTokens.sign({ sub: admin.userId, sid: session.id, role: 'admin' });
    const forged = await ctx.app.inject({
      method: 'GET',
      url: '/v1/admin/users',
      headers: { authorization: `Bearer ${noMfa}` },
    });
    expect(forged.statusCode).toBe(404);

    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'user' } });
    expect((await ok()).statusCode).toBe(404);
    await prisma.user.update({ where: { id: admin.userId }, data: { role: 'admin' } });

    await prisma.session.update({ where: { id: session.id }, data: { expiresAt: new Date() } });
    expect((await ok()).statusCode).toBe(404);
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() + 60_000) },
    });
    expect((await ok()).statusCode).toBe(200);

    expect((await browser.request({ method: 'POST', url: '/v1/auth/logout' })).statusCode).toBe(
      204,
    );
    expect((await ok()).statusCode).toBe(404);
  });

  it('keeps CSRF protection on admin writes', async () => {
    const browser = await adminBrowser(ctx, await enrolAdmin());
    const user = await registerMobile(ctx);
    const response = await browser.request({
      method: 'POST',
      url: `/v1/admin/users/${user.user.id}/restore`,
      csrf: false,
    });
    expect(response.statusCode).toBe(403);
    expect(problemCode(response)).toBe('CSRF_FAILED');
  });
});
