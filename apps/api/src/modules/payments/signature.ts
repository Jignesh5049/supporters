import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Razorpay signs the exact bytes of the request body: HMAC-SHA256 with the webhook secret, hex, in
 * `X-Razorpay-Signature`. It must be computed on the raw body (re-serialising parsed JSON changes
 * the bytes) and compared in constant time.
 */
export function signWebhookBody(rawBody: Buffer | string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

export function verifyWebhookSignature(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string,
): boolean {
  if (signature === undefined || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(signWebhookBody(rawBody, secret), 'hex');
  const given = Buffer.from(signature, 'hex');
  return given.length === expected.length && timingSafeEqual(given, expected);
}
