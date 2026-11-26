import { createHmac } from 'node:crypto';
import { z } from 'zod';
import { openSecret, sealSecret } from '../../lib/secret-box';
import type { PayoutDestination } from './payouts.provider';

const destinationSchema = z.discriminatedUnion('method', [
  z.object({ method: z.literal('upi'), upiId: z.string(), holderName: z.string() }),
  z.object({
    method: z.literal('bank'),
    accountNumber: z.string(),
    ifsc: z.string(),
    holderName: z.string(),
  }),
]);

/**
 * Payout details at rest: AES-256-GCM, one random 96-bit IV per value, and the user id bound as
 * additional authenticated data, so a ciphertext copied onto another user's row fails to open
 * (backend spec, Data protection). The key comes from config (SSM in production).
 */
export class PayoutVault {
  constructor(private readonly key: Buffer) {}

  seal(userId: string, destination: PayoutDestination): Uint8Array<ArrayBuffer> {
    return sealSecret(
      this.key,
      Buffer.from(JSON.stringify(destination), 'utf8'),
      `payout:${userId}`,
    );
  }

  /** The destination, or null if the key, the user or the bytes are wrong. */
  open(userId: string, sealed: Uint8Array): PayoutDestination | null {
    const plain = openSecret(this.key, sealed, `payout:${userId}`);
    if (!plain) return null;
    const parsed = destinationSchema.safeParse(JSON.parse(plain.toString('utf8')));
    return parsed.success ? parsed.data : null;
  }

  /** Same details, same hash: tells a resubmission apart from a change. Keyed, never reversible. */
  fingerprint(destination: PayoutDestination): string {
    const canonical =
      destination.method === 'upi'
        ? `upi:${destination.upiId}`
        : `bank:${destination.ifsc}:${destination.accountNumber}`;
    return createHmac('sha256', this.key).update(`payout-destination:${canonical}`).digest('hex');
  }
}

/** What screens may show: the last four digits, or the first two characters of a UPI id. */
export function maskDestination(destination: PayoutDestination): string {
  if (destination.method === 'bank') return `••••${destination.accountNumber.slice(-4)}`;
  const [name = '', handle = ''] = destination.upiId.split('@');
  return `${name.slice(0, 2)}••••@${handle}`;
}
