import { RATE_LIMITS } from '@supporters/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { sha256 } from '../../lib/crypto';
import {
  APP_ORIGIN,
  BREACHED_PASSWORD,
  Browser,
  PASSWORD,
  type TestContext,
  createTestApp,
  nextIp,
  nextPhone,
  prisma,
  problemCode,
  registerBody,
  registerBrowser,
  registerMobile,
  resetState,
  sendOtp,
  valkey,
} from '../../test/helpers';

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(resetState);

const mobileRefresh = (refreshToken: string) =>
  ctx.app.inject({
    method: 'POST',
    url: '/v1/auth/refresh',
    headers: { 'x-client': 'mobile' },
    payload: { refreshToken },
    remoteAddress: nextIp(),
  });

const getMe = (accessToken: string) =>
  ctx.app.inject({
    method: 'GET',
    url: '/v1/me',
    headers: { authorization: `Bearer ${accessToken}` },
  });

describe('POST /v1/auth/register', () => {
  it('creates the account and sets __Host- cookies for web, with no tokens in the body', async () => {
    const phone = nextPhone();
    await sendOtp(ctx.app, phone);
    const browser = new Browser(ctx.app);
    const response = await browser.request({
      method: 'POST',
      url: '/v1/auth/register',
      body: registerBody(phone, ctx.sms.lastCode(phone)),
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<Record<string, unknown>>();
    expect(body).toEqual({ user: expect.objectContaining({ phone, role: 'user' }) });

    const cookies = Object.fromEntries(response.cookies.map((cookie) => [cookie.name, cookie]));
    for (const name of ['__Host-at', '__Host-rt', '__Host-csrf']) {
      expect(cookies[name]).toMatchObject({ path: '/', secure: true, sameSite: 'Lax' });
      expect(cookies[name]).not.toHaveProperty('domain');
    }
    expect(cookies['__Host-at']).toMatchObject({ httpOnly: true, maxAge: 900 });
    expect(cookies['__Host-rt']).toMatchObject({ httpOnly: true });
    expect(cookies['__Host-csrf']?.httpOnly).toBeFalsy();

    const user = await prisma.user.findUniqueOrThrow({
      where: { phone },
      include: { consents: true },
    });
    expect(user.passwordHash).toMatch(/^\$argon2id\$v=19\$m=19456,p=1,t=2\$/);
    expect(user.consents).toHaveLength(1);
    expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7/); // UUIDv7
  });

  it('rejects a wrong OTP, a breached password, an old policy version and unknown keys', async () => {
    const phone = nextPhone();
    await sendOtp(ctx.app, phone);
    const code = ctx.sms.lastCode(phone);
    const wrong = code === '000000' ? '111111' : '000000';
    const register = (body: object) =>
      ctx.app.inject({ method: 'POST', url: '/v1/auth/register', payload: body });

    expect(problemCode(await register(registerBody(phone, wrong)))).toBe('OTP_INVALID');
    expect(
      problemCode(await register(registerBody(phone, code, { password: BREACHED_PASSWORD }))),
    ).toBe('PASSWORD_BREACHED');
    expect(
      problemCode(await register(registerBody(phone, code, { policyVersion: '2020-01-01' }))),
    ).toBe('POLICY_VERSION_OUTDATED');

    const unknownKey = await register(registerBody(phone, code, { role: 'admin' }));
    expect(unknownKey.statusCode).toBe(400);
    expect(unknownKey.headers['content-type']).toContain('application/problem+json');
    expect(unknownKey.json()).toMatchObject({
      type: `${APP_ORIGIN}/errors/validation-failed`,
      status: 400,
      code: 'VALIDATION_FAILED',
      requestId: expect.any(String),
    });

    // The rejected attempts above didn't burn the code.
    expect((await register(registerBody(phone, code))).statusCode).toBe(201);
  });

  it('returns tokens in the body for mobile and sets no cookies', async () => {
    const phone = nextPhone();
    await sendOtp(ctx.app, phone);
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      headers: { 'x-client': 'mobile' },
      payload: registerBody(phone, ctx.sms.lastCode(phone)),
    });
    expect(response.statusCode).toBe(201);
    expect(response.cookies).toHaveLength(0);
    expect(response.json()).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      expiresIn: 900,
    });
  });
});

describe('POST /v1/auth/otp/send', () => {
  it('answers the same for registered numbers but sends nothing', async () => {
    const { phone } = await registerBrowser(ctx);
    await valkey.del(`otp:cooldown:${phone}`);
    const sentBefore = ctx.sms.sent.length;
    const response = await sendOtp(ctx.app, phone, 'signup');
    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ expiresIn: 300, resendAfter: 30 });
    expect(ctx.sms.sent.length).toBe(sentBefore);
  });

  it('enforces the 30 s cooldown per number and the hourly limit per IP', async () => {
    const phone = nextPhone();
    expect((await sendOtp(ctx.app, phone)).statusCode).toBe(202);
    const again = await sendOtp(ctx.app, phone);
    expect(again.statusCode).toBe(429);
    expect(problemCode(again)).toBe('RATE_LIMITED');
    expect(Number(again.headers['retry-after'])).toBeGreaterThan(0);

    const ip = nextIp();
    const { max } = RATE_LIMITS.otpSendPerIp;
    for (let i = 0; i < max; i += 1) {
      expect((await sendOtp(ctx.app, nextPhone(), 'signup', ip)).statusCode).toBe(202);
    }
    expect((await sendOtp(ctx.app, nextPhone(), 'signup', ip)).statusCode).toBe(429);
  });

  it('allows 5 codes per number per hour', async () => {
    const phone = nextPhone();
    for (let i = 0; i < RATE_LIMITS.otpSendPerTarget.max; i += 1) {
      await valkey.del(`otp:cooldown:${phone}`); // skip the 30 s cooldown
      expect((await sendOtp(ctx.app, phone)).statusCode).toBe(202);
    }
    await valkey.del(`otp:cooldown:${phone}`);
    expect((await sendOtp(ctx.app, phone)).statusCode).toBe(429);
  });
});

describe('OTP verification', () => {
  it('rejects an expired code', async () => {
    const phone = nextPhone();
    await sendOtp(ctx.app, phone);
    await prisma.otpCode.updateMany({
      where: { target: phone },
      data: { expiresAt: new Date(Date.now() - 1_000) },
    });
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: registerBody(phone, ctx.sms.lastCode(phone)),
    });
    expect(problemCode(response)).toBe('OTP_INVALID');
  });

  it('locks the code after 5 wrong attempts, even for the right code', async () => {
    const phone = nextPhone();
    await sendOtp(ctx.app, phone);
    const code = ctx.sms.lastCode(phone);
    const wrong = code === '000000' ? '111111' : '000000';
    const attempt = (otp: string) =>
      ctx.app.inject({
        method: 'POST',
        url: '/v1/auth/register',
        payload: registerBody(phone, otp),
      });

    for (let i = 0; i < RATE_LIMITS.otpVerifyAttempts; i += 1) {
      expect(problemCode(await attempt(wrong))).toBe('OTP_INVALID');
    }
    expect(problemCode(await attempt(code))).toBe('OTP_ATTEMPTS_EXCEEDED');
  });

  it('stores only an HMAC of the code', async () => {
    const phone = nextPhone();
    await sendOtp(ctx.app, phone);
    const row = await prisma.otpCode.findFirstOrThrow({ where: { target: phone } });
    expect(row.codeHash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.codeHash).not.toContain(ctx.sms.lastCode(phone));
  });
});

describe('POST /v1/auth/login', () => {
  it('signs in with the phone number and password', async () => {
    const { phone } = await registerBrowser(ctx);
    const browser = new Browser(ctx.app);
    const response = await browser.request({
      method: 'POST',
      url: '/v1/auth/login',
      body: { identifier: phone, password: PASSWORD },
    });
    expect(response.statusCode).toBe(200);
    expect(browser.cookies.has('__Host-at')).toBe(true);
  });

  it('gives the same error for an unknown account and a wrong password', async () => {
    const { phone } = await registerBrowser(ctx);
    const login = (identifier: string, password: string) =>
      ctx.app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { identifier, password },
        remoteAddress: nextIp(),
      });
    const wrongPassword = await login(phone, 'not the password at all');
    const unknown = await login(nextPhone(), PASSWORD);
    expect(wrongPassword.statusCode).toBe(401);
    expect(unknown.statusCode).toBe(401);
    expect(wrongPassword.json().title).toBe(unknown.json().title);
    expect(problemCode(unknown)).toBe('INVALID_CREDENTIALS');
  });

  it('allows 5 attempts per minute per IP', async () => {
    const ip = nextIp();
    const login = () =>
      ctx.app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { identifier: nextPhone(), password: PASSWORD },
        remoteAddress: ip,
      });
    for (let i = 0; i < RATE_LIMITS.loginPerIp.max; i += 1) {
      expect((await login()).statusCode).toBe(401);
    }
    const limited = await login();
    expect(limited.statusCode).toBe(429);
    expect(problemCode(limited)).toBe('RATE_LIMITED');
  });

  it('locks the account for 15 minutes after 10 failures in an hour', async () => {
    const { phone } = await registerBrowser(ctx);
    const login = (password: string) =>
      ctx.app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { identifier: phone, password },
        remoteAddress: nextIp(), // spread over IPs, as a distributed attack would be
      });
    for (let i = 0; i < RATE_LIMITS.loginPerAccount.max; i += 1) {
      expect((await login('wrong password guess')).statusCode).toBe(401);
    }
    const locked = await login(PASSWORD);
    expect(locked.statusCode).toBe(429);
    expect(Number(locked.headers['retry-after'])).toBe(RATE_LIMITS.loginLockoutSec);
    // Still locked with the right password.
    expect((await login(PASSWORD)).statusCode).toBe(429);
  });
});

describe('POST /v1/auth/refresh', () => {
  it('issues 15-minute EdDSA access tokens with the spec claims', async () => {
    const session = await registerMobile(ctx);
    const [header, payload] = session.accessToken
      .split('.')
      .slice(0, 2)
      .map((part) => JSON.parse(Buffer.from(part, 'base64url').toString()));
    expect(header).toMatchObject({ alg: 'EdDSA', kid: 'test-key' });
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'role', 'sid', 'sub']);
    expect(payload.exp - payload.iat).toBe(900);
  });

  it('rotates the refresh token on every use', async () => {
    const session = await registerMobile(ctx);
    const first = await mobileRefresh(session.refreshToken);
    expect(first.statusCode).toBe(200);
    const rotated = first.json<{ accessToken: string; refreshToken: string }>();
    expect(rotated.refreshToken).not.toBe(session.refreshToken);
    expect((await getMe(rotated.accessToken)).statusCode).toBe(200);

    const stored = await prisma.session.findFirstOrThrow({
      where: { refreshTokenHash: sha256(rotated.refreshToken) },
    });
    expect(stored.previousTokenHash).toBe(sha256(session.refreshToken));
  });

  it('returns the same new token for the old one within the 10 s grace window', async () => {
    const session = await registerMobile(ctx);
    const [a, b] = await Promise.all([
      mobileRefresh(session.refreshToken),
      mobileRefresh(session.refreshToken),
    ]);
    expect(a.statusCode).toBe(200);
    expect(b.statusCode).toBe(200);
    expect(a.json().refreshToken).toBe(b.json().refreshToken);

    const retry = await mobileRefresh(session.refreshToken);
    expect(retry.json().refreshToken).toBe(a.json().refreshToken);
  });

  it('revokes the whole family when a replaced token is reused after the grace window', async () => {
    const session = await registerMobile(ctx);
    const rotated = (await mobileRefresh(session.refreshToken)).json<{
      accessToken: string;
      refreshToken: string;
    }>();

    // Simulate the 10 s passing.
    await valkey.del(`rt:grace:${sha256(session.refreshToken)}`);
    await prisma.session.updateMany({ data: { rotatedAt: new Date(Date.now() - 11_000) } });

    const reuse = await mobileRefresh(session.refreshToken);
    expect(reuse.statusCode).toBe(401);
    expect(problemCode(reuse)).toBe('INVALID_REFRESH_TOKEN');

    // The legitimate holder's newer tokens are dead too.
    expect((await mobileRefresh(rotated.refreshToken)).statusCode).toBe(401);
    expect((await getMe(rotated.accessToken)).statusCode).toBe(401);
    const stored = await prisma.session.findFirstOrThrow({ where: { userId: session.user.id } });
    expect(stored.revokedAt).not.toBeNull();
  });

  it('rejects unknown and expired refresh tokens', async () => {
    expect((await mobileRefresh('not-a-real-token')).statusCode).toBe(401);
    const session = await registerMobile(ctx);
    await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1_000) } });
    expect((await mobileRefresh(session.refreshToken)).statusCode).toBe(401);
  });

  it('rotates web cookies and keeps the CSRF token', async () => {
    const { browser } = await registerBrowser(ctx);
    const before = new Map(browser.cookies);
    const response = await browser.request({ method: 'POST', url: '/v1/auth/refresh' });
    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    expect(browser.cookies.get('__Host-rt')).not.toBe(before.get('__Host-rt'));
    expect(browser.cookies.get('__Host-csrf')).toBe(before.get('__Host-csrf'));
  });
});

describe('POST /v1/auth/logout', () => {
  it('revokes the session and clears web cookies', async () => {
    const { browser } = await registerBrowser(ctx);
    const accessToken = browser.cookies.get('__Host-at') ?? '';
    const refreshToken = browser.cookies.get('__Host-rt') ?? '';

    const response = await browser.request({ method: 'POST', url: '/v1/auth/logout' });
    expect(response.statusCode).toBe(204);
    expect(browser.cookies.size).toBe(0);

    // The old access token stops working at once (Valkey revoked set), not at expiry.
    expect((await getMe(accessToken)).statusCode).toBe(401);
    expect((await mobileRefresh(refreshToken)).statusCode).toBe(401);
  });

  it('revokes a mobile session from the bearer token', async () => {
    const session = await registerMobile(ctx);
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      headers: { authorization: `Bearer ${session.accessToken}`, 'x-client': 'mobile' },
    });
    expect(response.statusCode).toBe(204);
    expect((await getMe(session.accessToken)).statusCode).toBe(401);
    expect((await mobileRefresh(session.refreshToken)).statusCode).toBe(401);
  });
});

describe('POST /v1/auth/password/reset', () => {
  it('sets the new password and signs out every session', async () => {
    const session = await registerMobile(ctx);
    await valkey.del(`otp:cooldown:${session.phone}`);
    expect((await sendOtp(ctx.app, session.phone, 'reset')).statusCode).toBe(202);
    const newPassword = 'a brand new passphrase';
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/password/reset',
      payload: { phone: session.phone, otp: ctx.sms.lastCode(session.phone), newPassword },
    });
    expect(response.statusCode).toBe(204);
    expect((await getMe(session.accessToken)).statusCode).toBe(401);

    const login = (password: string) =>
      ctx.app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: { identifier: session.phone, password },
        remoteAddress: nextIp(),
      });
    expect((await login(PASSWORD)).statusCode).toBe(401);
    expect((await login(newPassword)).statusCode).toBe(200);
  });

  it('sends no reset code to unregistered numbers', async () => {
    const phone = nextPhone();
    expect((await sendOtp(ctx.app, phone, 'reset')).statusCode).toBe(202);
    expect(ctx.sms.sent.some((message) => message.phone === phone)).toBe(false);
  });
});

describe('CSRF on cookie-authenticated writes', () => {
  it('requires the x-csrf-token header to match the cookie', async () => {
    const { browser } = await registerBrowser(ctx);
    const missing = await browser.request({ method: 'POST', url: '/v1/auth/logout', csrf: false });
    expect(missing.statusCode).toBe(403);
    expect(problemCode(missing)).toBe('CSRF_FAILED');

    const wrong = await browser.request({
      method: 'POST',
      url: '/v1/auth/logout',
      csrf: false,
      headers: { 'x-csrf-token': 'forged' },
    });
    expect(wrong.statusCode).toBe(403);
  });

  it('requires Origin to be the app origin', async () => {
    const { browser } = await registerBrowser(ctx);
    const foreign = await browser.request({
      method: 'POST',
      url: '/v1/auth/logout',
      headers: { origin: 'https://evil.example' },
    });
    expect(foreign.statusCode).toBe(403);

    const cookies = Object.fromEntries(browser.cookies);
    const noOrigin = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      cookies,
      headers: { 'x-csrf-token': cookies['__Host-csrf'] ?? '' },
    });
    expect(noOrigin.statusCode).toBe(403);
  });

  it('blocks a cross-site login even without cookies', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      headers: { origin: 'https://evil.example' },
      payload: { identifier: nextPhone(), password: PASSWORD },
    });
    expect(response.statusCode).toBe(403);
  });

  it('skips the check for bearer requests', async () => {
    const session = await registerMobile(ctx);
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    expect(response.statusCode).toBe(204);
  });
});
