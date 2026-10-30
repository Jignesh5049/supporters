import { generateKeyPairSync, randomBytes } from 'node:crypto';

/**
 * Prints fresh local secrets for .env: an Ed25519 JWT signing key and the OTP
 * HMAC key. Staging and production keys live in SSM, never in files.
 */
const { privateKey } = generateKeyPairSync('ed25519');
const pem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();

process.stdout.write(
  [
    `JWT_PRIVATE_KEY=${Buffer.from(pem).toString('base64')}`,
    `JWT_KEY_ID=local-${new Date().toISOString().slice(0, 10)}`,
    `OTP_HMAC_KEY=${randomBytes(32).toString('base64')}`,
    '',
  ].join('\n'),
);
