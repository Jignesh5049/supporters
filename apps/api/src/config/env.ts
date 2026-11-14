import { createPrivateKey, createPublicKey } from 'node:crypto';
import { z } from 'zod';

/** Accepts a PEM string (with real or escaped newlines) or the base64 of one. */
function readPem(value: string): string {
  const text = value.includes('-----BEGIN') ? value : Buffer.from(value, 'base64').toString('utf8');
  return text.replaceAll('\\n', '\n').trim();
}

const ed25519PrivateKey = z.string().transform((value, ctx) => {
  try {
    const key = createPrivateKey(readPem(value));
    if (key.asymmetricKeyType !== 'ed25519') throw new Error('not ed25519');
    return {
      privatePem: key.export({ format: 'pem', type: 'pkcs8' }).toString(),
      publicPem: createPublicKey(key).export({ format: 'pem', type: 'spki' }).toString(),
    };
  } catch {
    ctx.addIssue({ code: 'custom', message: 'must be an Ed25519 private key (PKCS#8 PEM)' });
    return z.NEVER;
  }
});

const ed25519PublicKey = z.string().transform((value, ctx) => {
  try {
    const key = createPublicKey(readPem(value));
    if (key.asymmetricKeyType !== 'ed25519') throw new Error('not ed25519');
    return key.export({ format: 'pem', type: 'spki' }).toString();
  } catch {
    ctx.addIssue({ code: 'custom', message: 'must be an Ed25519 public key (SPKI PEM)' });
    return z.NEVER;
  }
});

const secretBytes = (minBytes: number) =>
  z
    .base64()
    .transform((value) => Buffer.from(value, 'base64'))
    .refine((buffer) => buffer.length >= minBytes, `must decode to at least ${minBytes} bytes`);

/** SMS providers that print codes instead of sending them. */
const DEV_ONLY_SMS_PROVIDERS: ReadonlySet<string> = new Set(['console']);

/** An unpadded base64url key of exactly `bytes` bytes (VAPID). */
const base64urlKey = (bytes: number) =>
  z
    .string()
    .regex(/^[\w-]+$/)
    .refine((value) => Buffer.from(value, 'base64url').length === bytes, `must be ${bytes} bytes`);

const booleanString = z.enum(['true', 'false']).transform((value) => value === 'true');

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    HOST: z.string().default('127.0.0.1'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    /** The single public origin, e.g. https://supporters.in. Cookie writes must come from it. */
    APP_ORIGIN: z.url().transform((value) => new URL(value).origin),
    /** Proxy hops in front of the API (CloudFront + Caddy = 2), used to find the client IP. */
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
    /** Comma-separated mobile dev origins allowed by CORS. Staging only. */
    CORS_ORIGINS: z
      .string()
      .default('')
      .transform((value) =>
        value
          .split(',')
          .map((origin) => origin.trim())
          .filter(Boolean),
      )
      .pipe(z.array(z.url())),
    DATABASE_URL: z.url().startsWith('postgres'),
    VALKEY_URL: z.url().startsWith('redis'),
    JWT_PRIVATE_KEY: ed25519PrivateKey,
    JWT_KEY_ID: z.string().min(1).max(64),
    /** The previous signing key's public half, kept for a day after rotation. */
    JWT_PREVIOUS_PUBLIC_KEY: ed25519PublicKey.optional(),
    JWT_PREVIOUS_KEY_ID: z.string().min(1).max(64).optional(),
    /** HMAC key for OTP codes. */
    OTP_HMAC_KEY: secretBytes(32),
    /** Encrypts admin TOTP secrets at rest. Required on staging and production. */
    TOTP_ENCRYPTION_KEY: secretBytes(32)
      .refine((key) => key.length === 32, 'must decode to exactly 32 bytes')
      .optional(),
    /** Check new passwords against Have I Been Pwned's k-anonymity range API. */
    BREACHED_PASSWORD_CHECK: booleanString.default(true),
    SMS_PROVIDER: z.enum(['console']).default('console'),
    /** The one private media bucket (backend spec, Security: Uploads). */
    S3_BUCKET: z.string().min(3).max(63),
    S3_REGION: z.string().min(1).default('ap-south-1'),
    /** S3-compatible endpoint (MinIO) for local development and tests. Unset on AWS. */
    S3_ENDPOINT: z.url().optional(),
    S3_FORCE_PATH_STYLE: booleanString.default(false),
    /** Local MinIO only; AWS uses the instance role. */
    S3_ACCESS_KEY_ID: z.string().min(1).optional(),
    S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
    /** Base URL that serves the public/ prefix, e.g. https://media.<domain>. */
    MEDIA_PUBLIC_URL: z.url().transform((value) => value.replace(/\/+$/, '')),
    /** Web Push (VAPID). Unset: web push is off and subscribing is refused. */
    VAPID_PUBLIC_KEY: base64urlKey(65).optional(),
    VAPID_PRIVATE_KEY: base64urlKey(32).optional(),
    /** A mailto: or https: contact for push services. */
    VAPID_SUBJECT: z
      .string()
      .regex(/^(mailto:|https:\/\/)/)
      .optional(),
    /** Expo enhanced push security; optional. */
    EXPO_ACCESS_TOKEN: z.string().min(1).optional(),
    EMAIL_PROVIDER: z.enum(['console', 'ses']).default('console'),
    /** Sender address on a domain verified in SES. */
    EMAIL_FROM: z.email().optional(),
    SES_REGION: z.string().min(1).default('ap-south-1'),
    /** Meilisearch, on the Docker network only (backend spec, Security). */
    MEILI_URL: z.url(),
    /** Scoped key with `search` only, for the API. Never the master key (`pnpm search:init`). */
    MEILI_SEARCH_KEY: z.string().min(16),
    /** Scoped key for documents and settings, for the worker and `pnpm search:reindex`. */
    MEILI_INDEX_KEY: z.string().min(16).optional(),
    /**
     * Payouts. Unset: the app boots and every payout endpoint answers 503 PAYOUTS_NOT_CONFIGURED.
     * 'fake' is for local development and tests; deployed environments refuse it.
     */
    PAYOUTS_PROVIDER: z.enum(['fake', 'razorpayx']).optional(),
    /** AES-256-GCM key for payout details at rest (32 bytes, base64). */
    PAYOUT_ENCRYPTION_KEY: secretBytes(32)
      .refine((key) => key.length === 32, 'must decode to exactly 32 bytes')
      .optional(),
    RAZORPAYX_KEY_ID: z.string().min(1).optional(),
    RAZORPAYX_KEY_SECRET: z.string().min(1).optional(),
    /** The RazorpayX current account the payouts are paid from. */
    RAZORPAYX_ACCOUNT_NUMBER: z.string().min(1).optional(),
    /** Signs RazorpayX webhooks. */
    RAZORPAYX_WEBHOOK_SECRET: z.string().min(16).optional(),
    /** Sentry (errors and 10% of traces). Unset: Sentry is off. src/instrument.ts reads it too. */
    SENTRY_DSN: z.url().optional(),
    SENTRY_RELEASE: z.string().min(1).max(200).optional(),
  })
  .superRefine((env, ctx) => {
    const isDeployed = env.NODE_ENV === 'staging' || env.NODE_ENV === 'production';
    if (isDeployed && !env.APP_ORIGIN.startsWith('https://')) {
      ctx.addIssue({ code: 'custom', path: ['APP_ORIGIN'], message: 'must use https' });
    }
    if (env.NODE_ENV === 'production' && env.CORS_ORIGINS.length > 0) {
      ctx.addIssue({ code: 'custom', path: ['CORS_ORIGINS'], message: 'is staging-only' });
    }
    if (isDeployed && env.EMAIL_PROVIDER === 'console') {
      ctx.addIssue({ code: 'custom', path: ['EMAIL_PROVIDER'], message: 'console is dev-only' });
    }
    if (env.EMAIL_PROVIDER === 'ses' && !env.EMAIL_FROM) {
      ctx.addIssue({ code: 'custom', path: ['EMAIL_FROM'], message: 'is required for ses' });
    }
    const vapid = [env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY, env.VAPID_SUBJECT];
    if (vapid.some(Boolean) && !vapid.every(Boolean)) {
      ctx.addIssue({
        code: 'custom',
        path: ['VAPID_PRIVATE_KEY'],
        message: 'set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT, or none',
      });
    }
    if (env.PAYOUTS_PROVIDER && !env.PAYOUT_ENCRYPTION_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['PAYOUT_ENCRYPTION_KEY'],
        message: 'is required when PAYOUTS_PROVIDER is set',
      });
    }
    if (isDeployed && env.PAYOUTS_PROVIDER === 'fake') {
      ctx.addIssue({
        code: 'custom',
        path: ['PAYOUTS_PROVIDER'],
        message: 'fake is dev-only; deployed environments need razorpayx',
      });
    }
    const razorpayx = [
      env.RAZORPAYX_KEY_ID,
      env.RAZORPAYX_KEY_SECRET,
      env.RAZORPAYX_ACCOUNT_NUMBER,
      env.RAZORPAYX_WEBHOOK_SECRET,
    ];
    if (env.PAYOUTS_PROVIDER === 'razorpayx' && !razorpayx.every(Boolean)) {
      ctx.addIssue({
        code: 'custom',
        path: ['RAZORPAYX_KEY_ID'],
        message:
          'set RAZORPAYX_KEY_ID, RAZORPAYX_KEY_SECRET, RAZORPAYX_ACCOUNT_NUMBER and RAZORPAYX_WEBHOOK_SECRET',
      });
    }
    if (env.PAYOUTS_PROVIDER !== 'razorpayx' && razorpayx.some(Boolean)) {
      ctx.addIssue({
        code: 'custom',
        path: ['PAYOUTS_PROVIDER'],
        message: 'RazorpayX credentials are set but PAYOUTS_PROVIDER is not razorpayx',
      });
    }
    if (isDeployed && !env.TOTP_ENCRYPTION_KEY) {
      ctx.addIssue({ code: 'custom', path: ['TOTP_ENCRYPTION_KEY'], message: 'is required' });
    }
    if (isDeployed && DEV_ONLY_SMS_PROVIDERS.has(env.SMS_PROVIDER)) {
      ctx.addIssue({ code: 'custom', path: ['SMS_PROVIDER'], message: 'console is dev-only' });
    }
    if (isDeployed && !env.MEDIA_PUBLIC_URL.startsWith('https://')) {
      ctx.addIssue({ code: 'custom', path: ['MEDIA_PUBLIC_URL'], message: 'must use https' });
    }
    if (isDeployed && (env.S3_ACCESS_KEY_ID ?? env.S3_SECRET_ACCESS_KEY ?? env.S3_ENDPOINT)) {
      ctx.addIssue({
        code: 'custom',
        path: ['S3_ACCESS_KEY_ID'],
        message: 'S3 endpoint and static keys are local-only; use the instance role',
      });
    }
    if (Boolean(env.S3_ACCESS_KEY_ID) !== Boolean(env.S3_SECRET_ACCESS_KEY)) {
      ctx.addIssue({
        code: 'custom',
        path: ['S3_SECRET_ACCESS_KEY'],
        message: 'set both S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY, or neither',
      });
    }
    if (Boolean(env.JWT_PREVIOUS_PUBLIC_KEY) !== Boolean(env.JWT_PREVIOUS_KEY_ID)) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_PREVIOUS_KEY_ID'],
        message: 'set both JWT_PREVIOUS_PUBLIC_KEY and JWT_PREVIOUS_KEY_ID, or neither',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;

/** Parses the environment once at boot and fails fast, naming each bad variable but never its value. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment:\n${problems}`);
  }
  return result.data;
}
