import type { FastifyBaseLogger } from 'fastify';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { AppError, ErrorCode, isUniqueViolation } from '../../lib/errors';
import { paymentsNotConfigured } from './payments.errors';
import { verifyWebhookSignature } from './signature';
import {
  type EventData,
  extractEventData,
  isHandledEvent,
  webhookEnvelopeSchema,
} from './webhook.events';

/** Razorpay's clocks are NTP-synced; this much future skew is tolerated, no more. */
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const EVENT_ID = /^[\w.-]{8,100}$/;

/** One generic answer for every kind of bad delivery, so a probe learns nothing. */
const invalidWebhook = () =>
  new AppError(400, ErrorCode.InvalidWebhook, 'Invalid webhook', {
    detail: 'The delivery could not be verified.',
  });

export type WebhookResult =
  | { outcome: 'accepted'; webhookEventId: string }
  | { outcome: 'duplicate' }
  | { outcome: 'ignored' };

/**
 * The receiving half of `POST /v1/webhooks/razorpay`: verify, de-duplicate, store, hand off. It does
 * no business logic (that is the `payments` queue's job) so it can answer in milliseconds.
 *
 * Checks, in order: the HMAC-SHA256 of the raw body (timing-safe), the event id header, the event's
 * own `created_at` (not older than `maxAgeSec`, not from the future), the shape of the payload. The
 * event id is then inserted under a unique constraint: a second delivery of it, however it arrives,
 * is acknowledged and does nothing.
 */
export class WebhookService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly secret: string | null,
    private readonly maxAgeSec: number,
    private readonly log: FastifyBaseLogger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async receive(
    rawBody: Buffer,
    headers: { signature: string | undefined; eventId: string | undefined },
  ): Promise<WebhookResult> {
    if (!this.secret) throw paymentsNotConfigured();
    if (!verifyWebhookSignature(rawBody, headers.signature, this.secret)) {
      this.log.warn('webhook signature rejected');
      throw invalidWebhook();
    }
    const eventId = headers.eventId;
    if (eventId === undefined || !EVENT_ID.test(eventId)) throw invalidWebhook();

    let json: unknown;
    try {
      json = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw invalidWebhook();
    }
    const envelope = webhookEnvelopeSchema.safeParse(json);
    if (!envelope.success) throw invalidWebhook();

    const occurredAt = new Date(envelope.data.created_at * 1000);
    const age = this.now().getTime() - occurredAt.getTime();
    if (age > this.maxAgeSec * 1000 || age < -MAX_FUTURE_SKEW_MS) {
      this.log.warn(
        { eventId, ageSec: Math.round(age / 1000) },
        'webhook outside the age tolerance',
      );
      throw invalidWebhook();
    }

    const { event } = envelope.data;
    let data: EventData = {};
    if (isHandledEvent(event)) {
      const extracted = extractEventData(event, envelope.data.payload);
      if (!extracted) throw invalidWebhook();
      data = extracted;
    }
    const isHandled = isHandledEvent(event);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const stored = await tx.webhookEvent.create({
          data: {
            providerEventId: eventId,
            type: event,
            occurredAt,
            data: data as Prisma.InputJsonObject,
            status: isHandled ? 'received' : 'ignored',
            ...(isHandled ? {} : { processedAt: this.now() }),
          },
        });
        if (!isHandled) {
          // Acknowledged and logged, no side effect.
          this.log.info({ eventId, event }, 'unhandled webhook event acknowledged');
          return { outcome: 'ignored' as const };
        }
        await tx.outboxEvent.create({
          data: { type: 'payments.webhook', payload: { webhookEventId: stored.id } },
        });
        return { outcome: 'accepted' as const, webhookEventId: stored.id };
      });
    } catch (error) {
      if (isUniqueViolation(error)) return { outcome: 'duplicate' };
      throw error;
    }
  }
}
