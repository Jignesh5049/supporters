import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { CURRENT_POLICY_VERSION } from '@supporters/shared';
import type { LightMyRequestResponse } from 'fastify';
import { inject } from 'vitest';
import { type App, type BuildAppOptions, buildApp } from '../app';
import { type Env, loadEnv } from '../config/env';
import type { BreachedPasswordChecker } from '../modules/auth/passwords';
import type { SmsSender } from '../modules/auth/sms';
import { createPrisma, createValkey } from '../plugins/data';
import { MINIO_CREDENTIALS, TEST_BUCKET } from './minio';

export const APP_ORIGIN = 'https://supporters.test';
export const PASSWORD = 'correct horse battery staple';
export const BREACHED_PASSWORD = 'password1234';

/** Shared by every test app, so admins enrolled by one test sign in to another. */
export const TEST_TOTP_KEY = randomBytes(32);

export const newSigningKey = () =>
  generateKeyPairSync('ed25519').privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();

export function testEnv(overrides: Record<string, string> = {}): Env {
  return loadEnv({
    NODE_ENV: 'test',
    APP_ORIGIN,
    DATABASE_URL: inject('databaseUrl'),
    VALKEY_URL: inject('valkeyUrl'),
    JWT_PRIVATE_KEY: newSigningKey(),
    JWT_KEY_ID: 'test-key',
    OTP_HMAC_KEY: randomBytes(32).toString('base64'),
    TOTP_ENCRYPTION_KEY: TEST_TOTP_KEY.toString('base64'),
    S3_BUCKET: TEST_BUCKET,
    S3_ENDPOINT: inject('s3Endpoint'),
    S3_FORCE_PATH_STYLE: 'true',
    S3_ACCESS_KEY_ID: MINIO_CREDENTIALS.accessKeyId,
    S3_SECRET_ACCESS_KEY: MINIO_CREDENTIALS.secretAccessKey,
    MEDIA_PUBLIC_URL: 'https://media.supporters.test',
    MEILI_URL: inject('meiliUrl'),
    MEILI_SEARCH_KEY: inject('meiliSearchKey'),
    MEILI_INDEX_KEY: inject('meiliIndexKey'),
    // Payments: the in-memory FakeRazorpay, and the supplier printed on invoices (Maharashtra).
    PAYMENTS_PROVIDER: 'fake',
    RAZORPAY_WEBHOOK_SECRET: 'whsec_test_0123456789abcdef0123456789abcdef',
    INVOICE_SELLER_NAME: 'Supporters Test Pvt Ltd',
    INVOICE_SELLER_GSTIN: '27AAPFU0939F1ZV',
    INVOICE_SELLER_ADDRESS: '1 Test Street, Mumbai, Maharashtra 400001',
    INVOICE_SELLER_STATE_CODE: '27',
    ...overrides,
  });
}

/** Captures OTPs instead of texting them. */
export class FakeSms implements SmsSender {
  readonly sent: { phone: string; code: string }[] = [];

  async sendOtp(phone: string, code: string) {
    this.sent.push({ phone, code });
  }

  lastCode(phone: string): string {
    const code = this.sent.findLast((message) => message.phone === phone)?.code;
    if (!code) throw new Error(`no OTP sent to ${phone}`);
    return code;
  }
}

class FakeBreachChecker implements BreachedPasswordChecker {
  async isBreached(password: string) {
    return password === BREACHED_PASSWORD;
  }
}

export const prisma = createPrisma(inject('databaseUrl'));
export const valkey = createValkey(inject('valkeyUrl'));

export interface TestContext {
  app: App;
  sms: FakeSms;
  env: Env;
}

export async function createTestApp(
  envOverrides: Record<string, string> = {},
  /** Registers test-only routes before the app is sealed. */
  beforeReady?: (app: App) => Promise<void>,
  appOptions: Partial<BuildAppOptions> = {},
): Promise<TestContext> {
  const sms = new FakeSms();
  const env = testEnv(envOverrides);
  const app = await buildApp({
    env,
    prisma,
    valkey,
    sms,
    breachChecker: new FakeBreachChecker(),
    logger: false,
    ...appOptions,
  });
  if (beforeReady) await beforeReady(app);
  await app.ready();
  return { app, sms, env };
}

const TRUNCATE_ALL =
  'TRUNCATE users, sessions, otp_codes, devices, consents, user_interests, businesses, products, services, uploads, listing_media, posts, post_media, comments, likes, saves, follows, feed_seen, outbox_events, webhook_events, invoice_sequences, premium_listing_holds CASCADE';

/** PostgreSQL `deadlock_detected` (SQLSTATE 40P01), as Prisma's pg adapter reports it. */
const isDeadlock = (error: unknown) => /40P01|deadlock detected/.test(String(error));

/**
 * Tests share one database: empty it (keeping reference data), and Valkey, before each test.
 *
 * TRUNCATE locks every table, while server-side socket handlers from the previous test (for
 * example a burst of `message:send`) can still be finishing writes after the client disconnects.
 * When the two collide, PostgreSQL aborts one of them with a deadlock. Retry the reset until those
 * stray writes have finished; this only happens in tests, which are the only code that truncates.
 */
export async function resetState() {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await prisma.$executeRawUnsafe(TRUNCATE_ALL);
      break;
    } catch (error) {
      if (!isDeadlock(error) || attempt >= 5) throw error;
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
    }
  }
  await valkey.flushdb();
}

let phoneCounter = 0;
export const nextPhone = () => `+9198${String(++phoneCounter).padStart(8, '0')}`;

/** Each simulated client gets its own IP so per-IP limits don't leak between tests. */
let ipCounter = 0;
export const nextIp = () => {
  ipCounter += 1;
  return `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
};

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** A cookie jar for one simulated browser on APP_ORIGIN. */
export class Browser {
  readonly cookies = new Map<string, string>();
  readonly ip = nextIp();

  constructor(private readonly app: App) {}

  async request(options: {
    method: Method;
    url: string;
    body?: object;
    headers?: Record<string, string>;
    /** Set false to leave out the x-csrf-token header. */
    csrf?: boolean;
  }): Promise<LightMyRequestResponse> {
    const headers: Record<string, string> = { origin: APP_ORIGIN, ...options.headers };
    const csrf = this.cookies.get('__Host-csrf');
    if (options.csrf !== false && csrf) headers['x-csrf-token'] = csrf;

    const response = await this.app.inject({
      method: options.method,
      url: options.url,
      headers,
      cookies: Object.fromEntries(this.cookies),
      remoteAddress: this.ip,
      ...(options.body !== undefined ? { payload: options.body } : {}),
    });

    for (const cookie of response.cookies as { name: string; value: string; maxAge?: number }[]) {
      if (cookie.maxAge === 0 || cookie.value === '') this.cookies.delete(cookie.name);
      else this.cookies.set(cookie.name, cookie.value);
    }
    return response;
  }
}

export function sendOtp(
  app: App,
  phone: string,
  purpose: 'signup' | 'reset' = 'signup',
  ip = nextIp(),
) {
  return app.inject({
    method: 'POST',
    url: '/v1/auth/otp/send',
    payload: { purpose, phone },
    remoteAddress: ip,
  });
}

export const registerBody = (phone: string, otp: string, overrides: object = {}) => ({
  name: 'Asha Traders',
  phone,
  password: PASSWORD,
  otp,
  policyVersion: CURRENT_POLICY_VERSION,
  ...overrides,
});

/** Registers through the real OTP flow and returns the signed-in browser. */
export async function registerBrowser(ctx: TestContext, phone = nextPhone()) {
  await sendOtp(ctx.app, phone);
  const browser = new Browser(ctx.app);
  const response = await browser.request({
    method: 'POST',
    url: '/v1/auth/register',
    body: registerBody(phone, ctx.sms.lastCode(phone)),
  });
  if (response.statusCode !== 201) throw new Error(`register failed: ${response.body}`);
  return { browser, phone, user: response.json<{ user: { id: string } }>().user };
}

export interface MobileSession {
  phone: string;
  user: { id: string };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** Registers, then signs in as the mobile app. */
export async function registerMobile(
  ctx: TestContext,
  phone = nextPhone(),
): Promise<MobileSession> {
  await registerBrowser(ctx, phone);
  const response = await ctx.app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    headers: { 'x-client': 'mobile' },
    payload: { identifier: phone, password: PASSWORD },
    remoteAddress: nextIp(),
  });
  if (response.statusCode !== 200) throw new Error(`login failed: ${response.body}`);
  return { phone, ...response.json<Omit<MobileSession, 'phone'>>() };
}

export const problemCode = (response: LightMyRequestResponse) =>
  response.json<{ code: string }>().code;
