import { generateKeyPairSync, randomBytes } from 'node:crypto';
import type { LightMyRequestResponse } from 'fastify';
import { inject } from 'vitest';
import { type App, buildApp } from '../app';
import { type Env, loadEnv } from '../config/env';
import { createPrisma, createValkey } from '../plugins/data';

export const APP_ORIGIN = 'https://supporters.test';

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

export const prisma = createPrisma(inject('databaseUrl'));
export const valkey = createValkey(inject('valkeyUrl'));

export interface TestContext {
  app: App;
  env: Env;
}

export async function createTestApp(
  envOverrides: Record<string, string> = {},
  /** Registers test-only routes before the app is sealed. */
  beforeReady?: (app: App) => Promise<void>,
): Promise<TestContext> {
  const env = testEnv(envOverrides);
  const app = await buildApp({ env, prisma, valkey, logger: false });
  if (beforeReady) await beforeReady(app);
  await app.ready();
  return { app, env };
}

/** Tests share one database: empty it, and Valkey, before each test. */
export async function resetState() {
  await prisma.$executeRawUnsafe(
    'TRUNCATE users, sessions, otp_codes, devices, consents, user_interests CASCADE',
  );
  await valkey.flushdb();
}

/** Each simulated client gets its own IP so per-IP limits don't leak between tests. */
let ipCounter = 0;
export const nextIp = () => {
  ipCounter += 1;
  return `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
};

export const problemCode = (response: LightMyRequestResponse) =>
  response.json<{ code: string }>().code;
