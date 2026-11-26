import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyBaseLogger } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from '../../generated/prisma/client';
import { AppError, ErrorCode } from '../../lib/errors';
import { isNameMatch } from '../../lib/name-match';
import { mapPayoutStatus, mapValidation } from './payouts.razorpayx';
import { applyPayoutResult } from './withdrawals.settlement';

/** A delivery older than this is a replay (RazorpayX retries for 24 hours), so it is not applied. */
const MAX_AGE_SEC = 48 * 3_600;

const envelopeSchema = z.object({
  event: z.string().min(1).max(100),
  created_at: z.number().int(),
  payload: z.record(z.string(), z.unknown()),
});
const payoutEntitySchema = z.object({
  id: z.string().min(1),
  status: z.enum([
    'queued',
    'pending',
    'processing',
    'processed',
    'reversed',
    'cancelled',
    'rejected',
    'failed',
  ]),
  reference_id: z.string().nullish(),
});
const validationEntitySchema = z.object({
  id: z.string().min(1),
  status: z.enum(['created', 'completed', 'failed']),
  results: z
    .object({ account_status: z.string().nullish(), registered_name: z.string().nullish() })
    .nullish(),
});
export const signatureInvalid = () =>
  new AppError(400, ErrorCode.WebhookSignatureInvalid, 'Invalid webhook');

/**
 * RazorpayX signs the raw body: HMAC-SHA256, hex, in `X-Razorpay-Signature`. Verified over the exact
 * bytes received (re-serialising parsed JSON would change them) with a constant-time compare.
 */
export function verifySignature(rawBody: Buffer, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const given = Buffer.from(signature, 'hex');
  // `Buffer.from(hex)` stops at the first bad character, so compare the re-encoded form too.
  return (
    given.length === expected.length &&
    given.toString('hex') === signature.toLowerCase() &&
    timingSafeEqual(given, expected)
  );
}

export class RazorpayxWebhookService {
  constructor(
    private readonly prisma: PrismaClient,
    /** Null until RAZORPAYX_WEBHOOK_SECRET is set: the endpoint then refuses everything. */
    private readonly secret: string | null,
    private readonly log: FastifyBaseLogger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Verify, de-duplicate on the event id, apply, mark processed. A signed delivery always gets a
   * 2xx once handled (or recognised as a repeat), so RazorpayX stops retrying it; an unsigned or
   * badly signed one gets a generic 400 and touches nothing.
   */
  async handle(input: {
    rawBody: Buffer;
    signature: string;
    eventId: string;
  }): Promise<'ok' | 'duplicate' | 'ignored'> {
    if (!this.secret) {
      throw new AppError(503, ErrorCode.PayoutsNotConfigured, 'Webhooks are not available yet');
    }
    if (!verifySignature(input.rawBody, input.signature, this.secret)) throw signatureInvalid();

    let json: unknown;
    try {
      json = JSON.parse(input.rawBody.toString('utf8'));
    } catch {
      throw signatureInvalid();
    }
    const envelope = envelopeSchema.safeParse(json);
    if (!envelope.success) {
      // Signed but not understood: acknowledge so it is not retried forever, and say so in the log.
      this.log.warn({ eventId: input.eventId }, 'razorpayx webhook with an unknown shape');
      return 'ignored';
    }
    const { event, created_at: createdAt, payload } = envelope.data;
    if (this.now().getTime() / 1000 - createdAt > MAX_AGE_SEC) return 'ignored';

    // One row per event id. The insert is the lock: a concurrent duplicate waits on it.
    const rows = await this.prisma.$executeRaw`
      INSERT INTO razorpayx_webhook_events (event_id, event_type, updated_at)
      VALUES (${input.eventId}, ${event}, now()) ON CONFLICT (event_id) DO NOTHING`;
    if (rows === 0) {
      const existing = await this.prisma.razorpayxWebhookEvent.findUniqueOrThrow({
        where: { eventId: input.eventId },
      });
      // Handled before: nothing to do. Seen but never finished (a crash): handle it again;
      // every handler is idempotent.
      if (existing.processedAt) return 'duplicate';
    }

    await this.apply(event, payload);
    await this.prisma.razorpayxWebhookEvent.update({
      where: { eventId: input.eventId },
      data: { processedAt: this.now() },
    });
    return 'ok';
  }

  private async apply(event: string, payload: Record<string, unknown>) {
    if (event.startsWith('payout.')) {
      const parsed = z
        .object({ payout: z.object({ entity: payoutEntitySchema }) })
        .safeParse(payload);
      if (!parsed.success) return;
      const entity = parsed.data.payout.entity;
      const withdrawal = await this.prisma.withdrawal.findFirst({
        where: {
          OR: [
            { providerPayoutId: entity.id },
            ...(entity.reference_id && z.uuid().safeParse(entity.reference_id).success
              ? [{ id: entity.reference_id }]
              : []),
          ],
        },
        select: { id: true },
      });
      if (!withdrawal) return;
      const status = mapPayoutStatus(entity.status);
      await applyPayoutResult(
        this.prisma,
        withdrawal.id,
        {
          payoutId: entity.id,
          status,
          failureReason: ['failed', 'reversed', 'cancelled'].includes(status)
            ? 'The bank could not complete the payout'
            : null,
        },
        this.now(),
      );
      return;
    }
    if (
      event === 'fund_account.validation.completed' ||
      event === 'fund_account.validation.failed'
    ) {
      const parsed = z
        .object({ 'fund_account.validation': z.object({ entity: validationEntitySchema }) })
        .safeParse(payload);
      if (!parsed.success) return;
      const entity = parsed.data['fund_account.validation'].entity;
      const account = await this.prisma.payoutAccount.findFirst({
        where: { providerValidationId: entity.id },
        include: { user: { select: { name: true } } },
      });
      if (!account || account.validationStatus !== 'pending') return;
      const registeredName = entity.results?.registered_name ?? null;
      await this.prisma.payoutAccount.update({
        where: { id: account.id },
        data: {
          validationStatus: mapValidation(entity),
          registeredName,
          isNameMatch: isNameMatch(account.user.name, registeredName ?? account.holderName),
        },
      });
    }
  }
}
