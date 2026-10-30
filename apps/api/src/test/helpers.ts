import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { CURRENT_POLICY_VERSION } from '@supporters/shared';
import type { LightMyRequestResponse } from 'fastify';
import { inject } from 'vitest';
import { type App, buildApp } from '../app';
import { type Env, loadEnv } from '../config/env';
import type { BreachedPasswordChecker } from '../modules/auth/passwords';
import type { SmsSender } from '../modules/auth/sms';
import { createPrisma, createValkey } from '../plugins/data';

export const APP_ORIGIN = 'https://supporters.test';
export const PASSWORD = 'correct horse battery staple';
export const BREACHED_PASSWORD = 'password1234';

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
  });
  if (beforeReady) await beforeReady(app);
  await app.ready();
  return { app, sms, env };
}

/** Tests share one database: empty it (keeping reference data), and Valkey, before each test. */
export async function resetState() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE users, sessions, otp_codes, devices, consents, user_interests, businesses CASCADE',
  );
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
