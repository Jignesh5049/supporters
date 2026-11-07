import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM for small secrets stored in the database (admin TOTP secrets).
 * `context` is bound as additional data (for example the user id), so a
 * ciphertext copied onto another row fails to open. Layout: iv | tag | body.
 */
export function sealSecret(
  key: Buffer,
  plaintext: Buffer,
  context: string,
): Uint8Array<ArrayBuffer> {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(context, 'utf8'));
  const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  // A copy on a plain ArrayBuffer, the type Prisma takes for Bytes.
  return new Uint8Array(Buffer.concat([iv, cipher.getAuthTag(), body]));
}

/** The plaintext, or null if the key, context or ciphertext is wrong. */
export function openSecret(key: Buffer, sealed: Uint8Array, context: string): Buffer | null {
  try {
    const raw = Buffer.from(sealed);
    const decipher = createDecipheriv('aes-256-gcm', key, raw.subarray(0, 12));
    decipher.setAAD(Buffer.from(context, 'utf8'));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
  } catch {
    return null;
  }
}
