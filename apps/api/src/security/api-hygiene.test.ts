import { randomUUID } from 'node:crypto';
import pino from 'pino';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { REDACT_PATHS } from '../app';
import { call, referenceData, signUpOwner } from '../test/catalog';
import {
  APP_ORIGIN,
  type Browser,
  type TestContext,
  createTestApp,
  nextIp,
  registerBrowser,
  resetState,
} from '../test/helpers';
import { POLICY } from './policy';

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp({}, async (app) => {
    // Test-only routes that misbehave, to see what a client is told.
    app.get('/__boom', async () => {
      throw new Error('connection to db-prod.internal:5432 failed, password=hunter2');
    });
    app.post('/__echo', async (request) => ({ ok: typeof request.body }));
  });
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(resetState);

const get = (url: string, headers: Record<string, string> = {}) =>
  ctx.app.inject({ method: 'GET', url, headers, remoteAddress: nextIp() });

describe('response headers', () => {
  it('sends the helmet set with a deny-all CSP, nothing identifying the stack', async () => {
    const response = await get('/v1/me');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
    expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['cross-origin-resource-policy']).toBe('same-origin');
    expect(response.headers['x-powered-by']).toBeUndefined();
    expect(response.headers.server).toBeUndefined();
  });

  it('marks everything uncacheable unless a route opts in', async () => {
    const browser = (await registerBrowser(ctx)).browser;
    for (const url of ['/v1/me', '/v1/me/saves', '/v1/notifications']) {
      const response = await browser.request({ method: 'GET', url });
      expect(response.headers['cache-control'], url).toBe('no-store');
    }
    const login = await ctx.app.inject({ method: 'GET', url: '/v1/auth/csrf' });
    expect(login.headers['cache-control']).toBe('no-store');
    expect((await get('/v1/nope')).headers['cache-control']).toBe('no-store');
    // The reference lists are public and cached on purpose.
    expect((await get('/v1/categories')).headers['cache-control']).toMatch(/public/);
  });

  it('answers a request id on every response, including errors', async () => {
    expect((await get('/v1/nope')).headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('CORS', () => {
  it('grants no origin cross-origin access by default', async () => {
    for (const origin of ['https://evil.example', 'null', APP_ORIGIN]) {
      const simple = await get('/v1/categories', { origin });
      expect(simple.headers['access-control-allow-origin'], origin).toBeUndefined();
      const preflight = await ctx.app.inject({
        method: 'OPTIONS',
        url: '/v1/me',
        headers: {
          origin,
          'access-control-request-method': 'GET',
          'access-control-request-headers': 'authorization',
        },
        remoteAddress: nextIp(),
      });
      expect(preflight.headers['access-control-allow-origin'], origin).toBeUndefined();
      expect(preflight.headers['access-control-allow-credentials']).toBeUndefined();
    }
  });
});

describe('error responses', () => {
  it('hide stack traces, messages and connection strings for a server error', async () => {
    const response = await get('/__boom');
    expect(response.statusCode).toBe(500);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).not.toMatch(/hunter2|db-prod|stack|\bat \w+|node_modules|\.ts:/i);
    expect(response.json()).toMatchObject({ status: 500, code: 'INTERNAL_ERROR' });
  });

  it('give a generic problem for malformed bodies, unknown routes and wrong types', async () => {
    const bad = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      headers: { 'content-type': 'application/json' },
      payload: '{"identifier": ',
      remoteAddress: nextIp(),
    });
    expect(bad.statusCode).toBe(400);
    expect(bad.body).not.toMatch(/Unexpected|JSON\.parse|position|at /);
    const text = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      headers: { 'content-type': 'text/plain' },
      payload: 'x',
      remoteAddress: nextIp(),
    });
    expect([400, 415]).toContain(text.statusCode);
    expect((await get('/v1/nope')).json()).toMatchObject({ status: 404, code: 'NOT_FOUND' });
  });

  it('refuse a body over 1 MiB before parsing it', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/__echo',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ pad: 'x'.repeat(1024 * 1024 + 10) }),
      remoteAddress: nextIp(),
    });
    expect(response.statusCode).toBe(413);
  });

  it('reject unknown fields, so extra properties cannot reach the database', async () => {
    const { browser } = await registerBrowser(ctx);
    const response = await browser.request({
      method: 'PATCH',
      url: '/v1/me/business',
      body: { name: 'x', role: 'admin', status: 'active', ownerId: randomUUID() },
    });
    expect(response.statusCode).toBe(400);
    const register = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/register',
      payload: { role: 'admin', status: 'active' },
      remoteAddress: nextIp(),
    });
    expect(register.statusCode).toBe(400);
  });
});

describe('session cookies', () => {
  it('are __Host- prefixed, Secure, Path=/, without Domain, and HttpOnly except the CSRF token', async () => {
    const { browser } = await registerBrowser(ctx);
    const response = await browser.request({
      method: 'POST',
      url: '/v1/auth/refresh',
    });
    expect(response.statusCode).toBe(204);
    const cookies = response.headers['set-cookie'] as string[];
    expect(cookies).toHaveLength(3);
    for (const cookie of cookies) {
      expect(cookie).toMatch(/^__Host-/);
      expect(cookie).toMatch(/; Secure/);
      expect(cookie).toMatch(/; Path=\//);
      expect(cookie).toMatch(/; SameSite=Lax/);
      expect(cookie).not.toMatch(/; Domain=/i);
      if (!cookie.startsWith('__Host-csrf=')) expect(cookie).toMatch(/; HttpOnly/);
      else expect(cookie).not.toMatch(/HttpOnly/);
    }
  });
});

/** Routes a browser reaches with its cookies: every write that needs a signed-in user. */
const WRITES = POLICY.user
  .filter((route) => !route.startsWith('GET '))
  .map((route) => route.split(' ') as [string, string]);

describe('CSRF on every cookie-authenticated write', () => {
  const url = (template: string) =>
    template.replace(/:\w+/g, () => randomUUID()).replace(randomUUID(), 'x');

  async function attempt(browser: Browser, method: string, template: string, options: object) {
    return browser.request({
      method: method as 'POST',
      url: url(template).replace('/saves/' + 'x', '/saves/product'),
      body: {},
      ...options,
    });
  }

  it.each(WRITES)('%s %s needs the CSRF header', async (method, template) => {
    const { browser } = await registerBrowser(ctx);
    const response = await attempt(browser, method, template, { csrf: false });
    expect(response.statusCode, response.body).toBe(403);
    expect(response.json().code).toBe('CSRF_FAILED');
  });

  it.each(WRITES)('%s %s needs the app Origin', async (method, template) => {
    const { browser } = await registerBrowser(ctx);
    const response = await attempt(browser, method, template, {
      headers: { origin: 'https://evil.example' },
    });
    expect(response.statusCode, response.body).toBe(403);
    expect(response.json().code).toBe('CSRF_FAILED');
  });

  it('also blocks a foreign Origin on sign-in, where there are no cookies yet', async () => {
    const response = await ctx.app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      headers: { origin: 'https://evil.example' },
      payload: { identifier: '+919800000000', password: 'whatever whatever' },
      remoteAddress: nextIp(),
    });
    expect(response.statusCode).toBe(403);
  });
});

describe('log redaction', () => {
  it('censors credentials, contact details and KYC identifiers at any depth', () => {
    const lines: string[] = [];
    const log = pino(
      { redact: { paths: REDACT_PATHS, censor: '[REDACTED]' } },
      { write: (line: string) => void lines.push(line) },
    );
    const secrets = [
      '+919812345678',
      'owner@example.com',
      'hunter2-password',
      '123456',
      '27AAPFU0939F1ZV',
      'ABCDE1234F',
      'JBSWY3DPEHPK3PXP',
      'https://fcm.googleapis.com/fcm/send/secret-device-endpoint',
      'refresh-token-value',
    ];
    log.info(
      {
        req: { headers: { authorization: 'Bearer abc', cookie: '__Host-at=abc' } },
        body: {
          phone: secrets[0],
          email: secrets[1],
          password: secrets[2],
          otp: secrets[3],
          refreshToken: secrets[8],
          code: secrets[3],
        },
        user: { phone: secrets[0], profile: { email: secrets[1] } },
        business: { gstin: secrets[4], pan: secrets[5] },
        admin: { totpSecret: secrets[6] },
        subscription: { endpoint: secrets[7] },
      },
      'request',
    );
    const line = lines.join('');
    for (const secret of secrets) expect(line, secret).not.toContain(secret);
    expect(line).not.toContain('Bearer abc');
    expect(line).not.toContain('__Host-at=abc');
  });
});

describe('what responses reveal', () => {
  const FORBIDDEN_KEYS = [
    'passwordHash',
    'password',
    'totpSecret',
    'refreshToken',
    'tokenHash',
    'codeHash',
    'otpHash',
    'key',
    'storageKey',
  ];

  function leaks(value: unknown, path = ''): string[] {
    if (Array.isArray(value)) return value.flatMap((item, i) => leaks(item, `${path}[${i}]`));
    if (typeof value !== 'object' || value === null) return [];
    return Object.entries(value).flatMap(([name, inner]) =>
      (FORBIDDEN_KEYS.includes(name) ? [`${path}.${name}`] : []).concat(
        leaks(inner, `${path}.${name}`),
      ),
    );
  }

  it("never include secrets, storage keys, or another user's phone or email", async () => {
    const refs = await referenceData();
    const { session: owner, business } = await signUpOwner(ctx, refs);
    const { browser: other } = await registerBrowser(ctx);
    const urls = [
      `/v1/businesses/${business.slug}`,
      `/v1/businesses/${business.id}/products`,
      `/v1/businesses/${business.id}/reviews`,
      `/v1/businesses/${business.id}/followers`,
      '/v1/feed',
      '/v1/discover',
      '/v1/search?q=Asha',
      '/v1/me',
      '/v1/me/business',
    ];
    for (const url of urls) {
      const response = await other.request({ method: 'GET', url });
      expect(response.statusCode, url).toBeLessThan(500);
      const body = response.body;
      expect(leaks(response.json()), url).toEqual([]);
      expect(body, url).not.toContain(owner.phone);
      expect(body, url).not.toMatch(/\$argon2/);
    }
    // The owner's own profile has their phone, and still no secrets.
    const mine = await call(ctx, 'GET', '/v1/me', { as: owner });
    expect(mine.body).toContain(owner.phone);
    expect(leaks(mine.json())).toEqual([]);
  });
});
