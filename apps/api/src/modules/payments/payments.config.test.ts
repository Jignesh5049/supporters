import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { loadEnv } from '../../config/env';
import { testEnv } from '../../test/helpers';
import { createPaymentsProvider } from './payments.factory';

const KEY_SECRET = 'sk_test_do_not_leak_0123456789';
const WEBHOOK_SECRET = 'whsec_do_not_leak_0123456789abcdef';

describe('configuration', () => {
  const deployed = (overrides: Record<string, string>) => {
    const base = testEnv();
    return {
      NODE_ENV: 'production',
      APP_ORIGIN: 'https://supporters.in',
      DATABASE_URL: base.DATABASE_URL,
      VALKEY_URL: base.VALKEY_URL,
      JWT_PRIVATE_KEY: base.JWT_PRIVATE_KEY.privatePem,
      JWT_KEY_ID: 'k',
      OTP_HMAC_KEY: base.OTP_HMAC_KEY.toString('base64'),
      TOTP_ENCRYPTION_KEY: randomBytes(32).toString('base64'),
      SMS_PROVIDER: 'console',
      EMAIL_PROVIDER: 'ses',
      EMAIL_FROM: 'no-reply@supporters.in',
      S3_BUCKET: 'supporters-media',
      MEILI_URL: base.MEILI_URL,
      MEILI_SEARCH_KEY: base.MEILI_SEARCH_KEY,
      MEDIA_PUBLIC_URL: 'https://media.supporters.in',
      ...overrides,
    };
  };

  it('boots without any payment settings, with payments off', () => {
    const env = testEnv({ PAYMENTS_PROVIDER: 'none' });
    expect(env.PAYMENTS_PROVIDER).toBe('none');
    expect(createPaymentsProvider(env)).toBeNull();
  });

  it('defaults to no provider when nothing is set', () => {
    const base = testEnv();
    const env = loadEnv({
      NODE_ENV: 'test',
      APP_ORIGIN: base.APP_ORIGIN,
      DATABASE_URL: base.DATABASE_URL,
      VALKEY_URL: base.VALKEY_URL,
      JWT_PRIVATE_KEY: base.JWT_PRIVATE_KEY.privatePem,
      JWT_KEY_ID: 'k',
      OTP_HMAC_KEY: base.OTP_HMAC_KEY.toString('base64'),
      S3_BUCKET: 'b-bucket',
      MEILI_URL: base.MEILI_URL,
      MEILI_SEARCH_KEY: base.MEILI_SEARCH_KEY,
      MEDIA_PUBLIC_URL: 'https://media.supporters.test',
    });
    expect(env.PAYMENTS_PROVIDER).toBe('none');
  });

  it('refuses the fake provider in staging and production', () => {
    for (const NODE_ENV of ['staging', 'production']) {
      expect(() =>
        loadEnv(
          deployed({
            NODE_ENV,
            PAYMENTS_PROVIDER: 'fake',
            RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
            SMS_PROVIDER: 'console',
          }),
        ),
      ).toThrow(/PAYMENTS_PROVIDER: fake is dev-only/);
    }
  });

  it('needs every Razorpay setting, and live keys only in production', () => {
    expect(() => loadEnv(deployed({ NODE_ENV: 'staging', PAYMENTS_PROVIDER: 'razorpay' }))).toThrow(
      /RAZORPAY_KEY_ID: is required[\s\S]*RAZORPAY_PLAN_ID: is required/,
    );
    const razorpay = {
      PAYMENTS_PROVIDER: 'razorpay',
      RAZORPAY_KEY_SECRET: KEY_SECRET,
      RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
      RAZORPAY_PLAN_ID: 'plan_Abc123',
    };
    expect(() =>
      loadEnv(deployed({ NODE_ENV: 'staging', ...razorpay, RAZORPAY_KEY_ID: 'rzp_live_abc123' })),
    ).toThrow(/RAZORPAY_KEY_ID: live keys are for production only/);
    // Test keys are fine on staging, and a clean message never echoes the secret.
    const staging = () =>
      loadEnv(deployed({ NODE_ENV: 'staging', ...razorpay, RAZORPAY_KEY_ID: 'rzp_test_abc123' }));
    expect(staging).not.toThrow(/PAYMENTS_PROVIDER|RAZORPAY/);
    // Production also needs the supplier details for invoices.
    expect(() => loadEnv(deployed({ ...razorpay, RAZORPAY_KEY_ID: 'rzp_live_abc123' }))).toThrow(
      /INVOICE_SELLER_GSTIN: is required/,
    );
  });

  it('never repeats a secret in a configuration error', () => {
    try {
      loadEnv(deployed({ PAYMENTS_PROVIDER: 'razorpay', RAZORPAY_KEY_SECRET: KEY_SECRET }));
      throw new Error('should not load');
    } catch (error) {
      expect(String(error)).not.toContain(KEY_SECRET);
    }
  });
});
