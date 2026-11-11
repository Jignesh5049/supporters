import { randomUUID } from 'node:crypto';
import { RATE_LIMITS } from '@supporters/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { loadEnv } from './config/env';
import { revokedSessionKey } from './modules/auth/auth.constants';
import {
  APP_ORIGIN,
  type TestContext,
  createTestApp,
  nextIp,
  problemCode,
  resetState,
  testEnv,
  valkey,
} from './test/helpers';

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp({}, async (app) => {
    app.get('/test/whoami', { config: { auth: 'user' } }, async (request) => request.auth);
    app.post('/test/write', async () => ({ ok: true }));
  });
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(resetState);

const signToken = (sid = randomUUID()) =>
  ctx.app.accessTokens.sign({ sub: randomUUID(), sid, role: 'user' });

describe('health', () => {
  it('reports liveness and readiness', async () => {
    expect((await ctx.app.inject('/health')).json()).toEqual({ status: 'ok' });
    expect((await ctx.app.inject('/ready')).json()).toEqual({
      status: 'ok',
      checks: { database: 'ok', valkey: 'ok' },
    });
  });
});

describe('pipeline', () => {
  it('sends security headers and a server-generated request id', async () => {
    const response = await ctx.app.inject({
      url: '/health',
      headers: { 'x-request-id': 'client-chosen' },
    });
    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-request-id']).not.toBe('client-chosen');
  });

  it('answers unknown routes and oversized bodies with problem details', async () => {
    const missing = await ctx.app.inject('/v1/nope');
    expect(missing.statusCode).toBe(404);
    expect(missing.headers['content-type']).toContain('application/problem+json');
    expect(missing.json()).toMatchObject({
      type: `${APP_ORIGIN}/errors/not-found`,
      status: 404,
      code: 'NOT_FOUND',
      requestId: expect.any(String),
    });

    const tooBig = await ctx.app.inject({
      method: 'POST',
      url: '/test/write',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ filler: 'x'.repeat(1024 * 1024) }),
    });
    expect(tooBig.statusCode).toBe(413);
    expect(problemCode(tooBig)).toBe('PAYLOAD_TOO_LARGE');
  });
});

describe('authentication hook', () => {
  it('accepts a bearer token or the __Host-at cookie, and rejects guests', async () => {
    const token = signToken();
    expect((await ctx.app.inject('/test/whoami')).statusCode).toBe(401);
    expect(
      (await ctx.app.inject({ url: '/test/whoami', headers: { authorization: `Bearer ${token}` } }))
        .statusCode,
    ).toBe(200);
    expect(
      (await ctx.app.inject({ url: '/test/whoami', cookies: { '__Host-at': token } })).statusCode,
    ).toBe(200);
  });

  it('ignores the cookie for mobile clients', async () => {
    const response = await ctx.app.inject({
      url: '/test/whoami',
      headers: { 'x-client': 'mobile' },
      cookies: { '__Host-at': signToken() },
    });
    expect(response.statusCode).toBe(401);
  });

  it('rejects a revoked session at once', async () => {
    const sid = randomUUID();
    const token = signToken(sid);
    await valkey.set(revokedSessionKey(sid), '1');
    const response = await ctx.app.inject({
      url: '/test/whoami',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(401);
    expect(problemCode(response)).toBe('UNAUTHENTICATED');
  });
});

describe('CSRF', () => {
  const write = (headers: Record<string, string>, cookies: Record<string, string> = {}) =>
    ctx.app.inject({ method: 'POST', url: '/test/write', headers, cookies });

  it('requires Origin and a matching x-csrf-token on cookie-authenticated writes', async () => {
    const cookies = { '__Host-at': signToken(), '__Host-csrf': 'csrf-token-value' };
    expect((await write({ origin: APP_ORIGIN }, cookies)).statusCode).toBe(403);
    expect(
      (await write({ origin: APP_ORIGIN, 'x-csrf-token': 'forged' }, cookies)).statusCode,
    ).toBe(403);
    expect((await write({ 'x-csrf-token': 'csrf-token-value' }, cookies)).statusCode).toBe(403);
    const ok = await write({ origin: APP_ORIGIN, 'x-csrf-token': 'csrf-token-value' }, cookies);
    expect(ok.statusCode).toBe(200);
  });

  it('rejects a foreign Origin even without cookies, and skips bearer requests', async () => {
    const foreign = await write({ origin: 'https://evil.example' });
    expect(foreign.statusCode).toBe(403);
    expect(problemCode(foreign)).toBe('CSRF_FAILED');
    expect((await write({ authorization: `Bearer ${signToken()}` })).statusCode).toBe(200);
  });
});

describe('rate limit', () => {
  it('allows guests 300 requests a minute per IP, then answers 429 with Retry-After', async () => {
    const remoteAddress = nextIp();
    for (let i = 0; i < RATE_LIMITS.guestRequests.max; i += 1) {
      await ctx.app.inject({ url: '/test/whoami', remoteAddress });
    }
    const limited = await ctx.app.inject({ url: '/test/whoami', remoteAddress });
    expect(limited.statusCode).toBe(429);
    expect(problemCode(limited)).toBe('RATE_LIMITED');
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);

    // Another IP is unaffected.
    const other = await ctx.app.inject({ url: '/test/whoami', remoteAddress: nextIp() });
    expect(other.statusCode).toBe(401);
  });

  it('keys signed-in requests by user with the higher limit', async () => {
    const response = await ctx.app.inject({
      url: '/test/whoami',
      headers: { authorization: `Bearer ${signToken()}` },
    });
    expect(response.headers['x-ratelimit-limit']).toBe(String(RATE_LIMITS.userRequests.max));
  });
});

describe('env', () => {
  it('fails fast and names bad variables without echoing values', () => {
    const load = () => loadEnv({ APP_ORIGIN: 'not a url', JWT_PRIVATE_KEY: 'secret-value' });
    expect(load).toThrow(/APP_ORIGIN[\s\S]*DATABASE_URL/);
    expect(load).not.toThrow(/secret-value/);
  });

  it('refuses console SMS and http origins outside development', () => {
    const base = testEnv();
    expect(() =>
      loadEnv({
        NODE_ENV: 'production',
        APP_ORIGIN: 'http://supporters.in',
        DATABASE_URL: base.DATABASE_URL,
        VALKEY_URL: base.VALKEY_URL,
        JWT_PRIVATE_KEY: base.JWT_PRIVATE_KEY.privatePem,
        JWT_KEY_ID: 'k',
        OTP_HMAC_KEY: base.OTP_HMAC_KEY.toString('base64'),
        S3_BUCKET: 'supporters-media',
        MEILI_URL: base.MEILI_URL,
        MEILI_SEARCH_KEY: base.MEILI_SEARCH_KEY,
        MEDIA_PUBLIC_URL: 'https://media.supporters.in',
      }),
    ).toThrow(/APP_ORIGIN: must use https[\s\S]*SMS_PROVIDER/);
  });

  it('keeps MinIO endpoints and static S3 keys out of deployed environments', () => {
    const base = testEnv();
    expect(() =>
      loadEnv({
        NODE_ENV: 'staging',
        APP_ORIGIN: 'https://staging.supporters.in',
        DATABASE_URL: base.DATABASE_URL,
        VALKEY_URL: base.VALKEY_URL,
        JWT_PRIVATE_KEY: base.JWT_PRIVATE_KEY.privatePem,
        JWT_KEY_ID: 'k',
        OTP_HMAC_KEY: base.OTP_HMAC_KEY.toString('base64'),
        S3_BUCKET: 'supporters-media',
        MEILI_URL: base.MEILI_URL,
        MEILI_SEARCH_KEY: base.MEILI_SEARCH_KEY,
        S3_ACCESS_KEY_ID: 'static-key-id',
        S3_SECRET_ACCESS_KEY: 'static-secret',
        MEDIA_PUBLIC_URL: 'http://media.supporters.in',
      }),
    ).toThrow(/MEDIA_PUBLIC_URL: must use https[\s\S]*S3_ACCESS_KEY_ID: S3 endpoint/);
  });
});
