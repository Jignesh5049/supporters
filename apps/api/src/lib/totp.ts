import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * TOTP (RFC 6238) with the authenticator-app defaults: HMAC-SHA1, 30-second
 * steps, 6 digits. Admin sign-in only (backend spec, Security: Admin).
 */
export const TOTP = {
  stepSec: 30,
  digits: 6,
  secretBytes: 20,
  issuer: 'Supporters Admin',
} as const;

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32.charAt((value >>> (bits - 5)) & 31);
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32.charAt((value << (5 - bits)) & 31);
  return output;
}

export function base32Decode(text: string): Buffer {
  const clean = text.replace(/[\s=]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const output: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index === -1) throw new Error('invalid base32');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

export const generateTotpSecret = (): Buffer => randomBytes(TOTP.secretBytes);

/** The code for one time step (RFC 4226 dynamic truncation). */
export function totpAt(secret: Buffer, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac('sha1', secret).update(counter).digest();
  const offset = (hmac.at(-1) ?? 0) & 0xf;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** TOTP.digits).padStart(TOTP.digits, '0');
}

export const currentStep = (nowMs: number) => Math.floor(nowMs / 1000 / TOTP.stepSec);

/**
 * The time step `code` matches, allowing one step of clock drift either way,
 * or null. The caller must refuse a step that was already used (replay).
 */
export function matchTotp(secret: Buffer, code: string, nowMs = Date.now()): number | null {
  if (!/^\d{6}$/.test(code)) return null;
  const now = currentStep(nowMs);
  let matched: number | null = null;
  // Check every candidate, so the timing doesn't reveal which one matched.
  for (const step of [now - 1, now, now + 1]) {
    const expected = Buffer.from(totpAt(secret, step));
    if (timingSafeEqual(expected, Buffer.from(code)) && matched === null) matched = step;
  }
  return matched;
}

/** The otpauth:// URI an authenticator app scans (as a QR code) or imports. */
export function totpUri(secret: Buffer, accountName: string): string {
  const label = encodeURIComponent(`${TOTP.issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret: base32Encode(secret),
    issuer: TOTP.issuer,
    algorithm: 'SHA1',
    digits: String(TOTP.digits),
    period: String(TOTP.stepSec),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
