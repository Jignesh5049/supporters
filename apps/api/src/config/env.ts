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
    /** Check new passwords against Have I Been Pwned's k-anonymity range API. */
    BREACHED_PASSWORD_CHECK: booleanString.default(true),
    SMS_PROVIDER: z.enum(['console']).default('console'),
  })
  .superRefine((env, ctx) => {
    const isDeployed = env.NODE_ENV === 'staging' || env.NODE_ENV === 'production';
    if (isDeployed && !env.APP_ORIGIN.startsWith('https://')) {
      ctx.addIssue({ code: 'custom', path: ['APP_ORIGIN'], message: 'must use https' });
    }
    if (env.NODE_ENV === 'production' && env.CORS_ORIGINS.length > 0) {
      ctx.addIssue({ code: 'custom', path: ['CORS_ORIGINS'], message: 'is staging-only' });
    }
    if (isDeployed && DEV_ONLY_SMS_PROVIDERS.has(env.SMS_PROVIDER)) {
      ctx.addIssue({ code: 'custom', path: ['SMS_PROVIDER'], message: 'console is dev-only' });
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
