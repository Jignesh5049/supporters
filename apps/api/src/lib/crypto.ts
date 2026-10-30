import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  hkdfSync,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from 'node:crypto';

/** 256-bit random token, base64url (43 characters). */
export const randomToken = (): string => randomBytes(32).toString('base64url');

export const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex');

export const hmacSha256 = (key: Buffer, value: string): string =>
  createHmac('sha256', key).update(value).digest('hex');

/** Constant-time comparison of two hex digests or tokens. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Uniform numeric code from the CSPRNG, zero-padded. */
export const randomDigits = (digits: number): string =>
  randomInt(0, 10 ** digits)
    .toString()
    .padStart(digits, '0');

/**
 * AES-256-GCM with a key derived from `secret` (HKDF-SHA256). Used to park a
 * value that only the holder of `secret` can read back.
 */
export function sealWith(secret: string, plaintext: string): string {
  const key = Buffer.from(hkdfSync('sha256', secret, '', 'supporters-seal', 32));
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}

export function openWith(secret: string, sealed: string): string | null {
  try {
    const raw = Buffer.from(sealed, 'base64url');
    const key = Buffer.from(hkdfSync('sha256', secret, '', 'supporters-seal', 32));
    const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
}
