import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  type TestContext,
  createTestApp,
  newSigningKey,
  problemCode,
  registerBrowser,
  registerMobile,
  resetState,
} from '../../test/helpers';

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(resetState);

const getMe = (headers: Record<string, string> = {}, cookies: Record<string, string> = {}) =>
  ctx.app.inject({ method: 'GET', url: '/v1/me', headers, cookies });

/** Authorization matrix for GET /v1/me (backend spec, Testing). Admins arrive with admin TOTP login. */
describe('GET /v1/me', () => {
  it('rejects guests', async () => {
    const response = await getMe();
    expect(response.statusCode).toBe(401);
    expect(problemCode(response)).toBe('UNAUTHENTICATED');
  });

  it('returns the user for the web cookie', async () => {
    const { browser, user } = await registerBrowser(ctx);
    const response = await getMe({}, Object.fromEntries(browser.cookies));
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ id: user.id, role: 'user' });
    expect(response.json()).not.toHaveProperty('passwordHash');
  });

  it('returns the user for a mobile bearer token, and only that user', async () => {
    const alice = await registerMobile(ctx);
    const bob = await registerMobile(ctx);
    const response = await getMe({ authorization: `Bearer ${bob.accessToken}` });
    expect(response.json().id).toBe(bob.user.id);
    expect(response.json().id).not.toBe(alice.user.id);
  });

  it('ignores the cookie in header mode', async () => {
    const { browser } = await registerBrowser(ctx);
    const response = await getMe({ 'x-client': 'mobile' }, Object.fromEntries(browser.cookies));
    expect(response.statusCode).toBe(401);
  });

  it('rejects tampered, foreign-key and expired tokens', async () => {
    const session = await registerMobile(ctx);
    const [header, payload, signature] = session.accessToken.split('.');
    const forgedPayload = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(payload ?? '', 'base64url').toString()),
        role: 'admin',
      }),
    ).toString('base64url');
    const tampered = `${header}.${forgedPayload}.${signature}`;
    expect((await getMe({ authorization: `Bearer ${tampered}` })).statusCode).toBe(401);

    // Same kid, different key: the signature check fails.
    const other = await createTestApp({ JWT_PRIVATE_KEY: newSigningKey() });
    const foreign = other.app.accessTokens.sign({
      sub: session.user.id,
      sid: crypto.randomUUID(),
      role: 'user',
    });
    await other.app.close();
    expect((await getMe({ authorization: `Bearer ${foreign}` })).statusCode).toBe(401);

    const expired = ctx.app.jwt.sign(
      { sub: session.user.id, sid: crypto.randomUUID(), role: 'user' },
      { expiresIn: 1 },
    );
    await new Promise((resolve) => setTimeout(resolve, 1_100));
    expect((await getMe({ authorization: `Bearer ${expired}` })).statusCode).toBe(401);
  });

  it('accepts tokens signed with the previous key during rotation', async () => {
    const previousKey = newSigningKey();
    const old = await createTestApp({ JWT_PRIVATE_KEY: previousKey, JWT_KEY_ID: 'old-key' });
    const session = await registerMobile(old);
    await old.app.close();

    const { createPublicKey } = await import('node:crypto');
    const rotated = await createTestApp({
      JWT_KEY_ID: 'new-key',
      JWT_PREVIOUS_PUBLIC_KEY: createPublicKey(previousKey)
        .export({ format: 'pem', type: 'spki' })
        .toString(),
      JWT_PREVIOUS_KEY_ID: 'old-key',
    });
    const response = await rotated.app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { authorization: `Bearer ${session.accessToken}` },
    });
    await rotated.app.close();
    expect(response.statusCode).toBe(200);
  });
});
