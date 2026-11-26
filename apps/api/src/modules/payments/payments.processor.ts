import { PREMIUM } from '@supporters/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { recordEvent } from '../notifications/outbox';
import {
  DAY_MS,
  type SubscriptionRow,
  endSubscription,
  enterGrace,
  lockSubscription,
  perksEnd,
  releaseHolds,
  setPremiumUntil,
} from './lifecycle';
import type { InvoicesService } from './invoices.service';
import type { PaymentsProvider } from './provider';
import type { EventData, HandledEvent } from './webhook.events';

type Tx = Prisma.TransactionClient;
type Outcome = { status: 'processed' | 'ignored'; note?: string };

export interface PaymentsJob {
  webhookEventId: string;
}

/** The newer of two dates. */
const newer = (a: Date | null, b: Date) => (a && a > b ? a : b);

/**
 * Applies verified, stored webhook events (the `payments` queue). Everything is idempotent and
 * order-tolerant: a replay does nothing, a payment id is recorded once, a failure older than the
 * newest charge is ignored, and a period never moves backwards. Subscription rows are locked, so
 * two events for one subscription never interleave.
 */
export class PaymentsProcessor {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly provider: PaymentsProvider | null,
    private readonly invoices: InvoicesService,
    private readonly log: FastifyBaseLogger,
  ) {}

  async process(webhookEventId: string): Promise<'processed' | 'ignored' | 'duplicate'> {
    const stored = await this.prisma.webhookEvent.findUnique({ where: { id: webhookEventId } });
    if (!stored) return 'ignored';
    if (stored.status === 'processed' || stored.status === 'ignored') return 'duplicate';
    const data = stored.data as EventData;

    try {
      // A payment.failed delivery does not always name its subscription: ask the provider
      // (a server-side fetch), outside the transaction.
      if (stored.type === 'payment.failed' && data.payment && !data.payment.subscriptionId) {
        data.payment.subscriptionId =
          (await this.provider?.findSubscriptionOfPayment(data.payment.id)) ?? null;
      }
      const outcome = await this.prisma.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT id FROM webhook_events WHERE id = ${webhookEventId}::uuid FOR UPDATE`;
          const row = await tx.webhookEvent.findUniqueOrThrow({ where: { id: webhookEventId } });
          if (row.status === 'processed' || row.status === 'ignored') {
            return { status: 'duplicate' as const };
          }
          const result = await this.apply(tx, stored.type as HandledEvent, data, stored.occurredAt);
          await tx.webhookEvent.update({
            where: { id: webhookEventId },
            data: {
              status: result.status,
              processedAt: new Date(),
              attempts: { increment: 1 },
              lastError: result.note ?? null,
            },
          });
          return result;
        },
        { timeout: 30_000 },
      );
      return outcome.status;
    } catch (error) {
      await this.prisma.webhookEvent
        .update({
          where: { id: webhookEventId },
          data: {
            status: 'failed',
            attempts: { increment: 1 },
            lastError: (error instanceof Error ? error.message : String(error)).slice(0, 500),
          },
        })
        .catch(() => undefined);
      throw error;
    }
  }

  private async apply(
    tx: Tx,
    type: HandledEvent,
    data: EventData,
    occurredAt: Date,
  ): Promise<Outcome> {
    switch (type) {
      case 'subscription.charged':
        return this.applyCharge(tx, data, occurredAt);
      case 'payment.failed':
        return this.applyFailure(tx, data, occurredAt);
      case 'subscription.halted':
        return this.applyHalted(tx, data, occurredAt);
      case 'subscription.cancelled':
        return this.applyCancelled(tx, data, occurredAt);
      case 'refund.processed':
        return this.applyRefund(tx, data, occurredAt);
    }
  }

  private async applyCharge(tx: Tx, data: EventData, occurredAt: Date): Promise<Outcome> {
    const { subscription: eventSub, payment: eventPayment } = data;
    if (!eventSub || !eventPayment) return { status: 'ignored', note: 'malformed' };
    const sub = await lockSubscription(tx, { providerSubscriptionId: eventSub.id });
    if (!sub) return { status: 'ignored', note: 'unknown subscription' };
    // Trust the amount we sold, not a field of the delivery: a different amount is never Premium.
    if (
      BigInt(eventPayment.amountPaise) !== sub.amountPaise ||
      eventPayment.currency !== sub.currency
    ) {
      this.log.warn(
        { subscriptionId: sub.id, paymentId: eventPayment.id },
        'charge amount mismatch',
      );
      return { status: 'ignored', note: 'amount mismatch' };
    }

    const existing = await tx.payment.findUnique({ where: { providerPaymentId: eventPayment.id } });
    if (existing && existing.status !== 'failed')
      return { status: 'processed', note: 'duplicate payment' };

    const capturedBefore = await tx.payment.count({
      where: { subscriptionId: sub.id, capturedAt: { not: null } },
    });
    const isFirst = capturedBefore === 0;
    const data2 = {
      subscriptionId: sub.id,
      businessId: sub.businessId,
      status: 'captured',
      amountPaise: sub.amountPaise,
      currency: sub.currency,
      isFirst,
      failureCode: null,
      capturedAt: occurredAt,
    } as const;
    const payment = existing
      ? await tx.payment.update({ where: { id: existing.id }, data: data2 })
      : await tx.payment.create({ data: { ...data2, providerPaymentId: eventPayment.id } });

    const periodStart = eventSub.currentStart ? new Date(eventSub.currentStart) : occurredAt;
    const periodEnd = eventSub.currentEnd
      ? new Date(eventSub.currentEnd)
      : new Date(periodStart.getTime() + PREMIUM.periodDays * DAY_MS);

    if (sub.status === 'ended') {
      // Money arrived for a subscription that is over (a late charge after expiry, or after a
      // refund). Keep the payment and its invoice; perks are not restored. Support decides.
      await this.invoices.issue(tx, payment.id, occurredAt);
      this.log.warn(
        { subscriptionId: sub.id, paymentId: payment.id },
        'charge on an ended subscription',
      );
      return { status: 'processed', note: 'charge on ended subscription' };
    }

    // A charge older than the failure that already put the subscription in grace (the two were
    // delivered out of order) is recorded, but must not end the grace the later event started.
    const failureAt = sub.graceEndsAt
      ? new Date(sub.graceEndsAt.getTime() - PREMIUM.graceDays * DAY_MS)
      : null;
    if (sub.status === 'past_due' && failureAt && occurredAt < failureAt) {
      await this.invoices.issue(tx, payment.id, occurredAt);
      return { status: 'processed', note: 'charge older than the failure' };
    }

    // The period only moves forward, so an older charge delivered late cannot shorten Premium.
    const isNewerPeriod = !sub.currentPeriodEnd || periodEnd > sub.currentPeriodEnd;
    const updated = await tx.subscription.update({
      where: { id: sub.id },
      data: {
        status: 'active',
        graceEndsAt: null,
        lastChargeEventAt: newer(sub.lastChargeEventAt, occurredAt),
        ...(isNewerPeriod ? { currentPeriodStart: periodStart, currentPeriodEnd: periodEnd } : {}),
      },
    });
    const until = perksEnd(updated);
    if (until) await setPremiumUntil(tx, sub.businessId, until);
    await releaseHolds(tx, sub.businessId);

    const business = await tx.business.findUniqueOrThrow({
      where: { id: sub.businessId },
      select: { ownerUserId: true },
    });
    if (isFirst) {
      await recordEvent(tx, 'premium.activated', {
        businessId: sub.businessId,
        userId: business.ownerUserId,
        paymentId: payment.id,
        amountPaise: Number(sub.amountPaise),
        currency: 'INR',
        occurredAt: occurredAt.toISOString(),
      });
    } else {
      await recordEvent(tx, 'premium.renewed', { subscriptionId: sub.id, paymentId: payment.id });
    }
    await this.invoices.issue(tx, payment.id, occurredAt);
    return { status: 'processed' };
  }

  private async applyFailure(tx: Tx, data: EventData, occurredAt: Date): Promise<Outcome> {
    const eventPayment = data.payment;
    if (!eventPayment?.subscriptionId)
      return { status: 'ignored', note: 'not a subscription payment' };
    const sub = await lockSubscription(tx, { providerSubscriptionId: eventPayment.subscriptionId });
    if (!sub) return { status: 'ignored', note: 'unknown subscription' };

    const existing = await tx.payment.findUnique({ where: { providerPaymentId: eventPayment.id } });
    if (!existing) {
      await tx.payment.create({
        data: {
          subscriptionId: sub.id,
          businessId: sub.businessId,
          providerPaymentId: eventPayment.id,
          status: 'failed',
          amountPaise: sub.amountPaise,
          currency: sub.currency,
          failureCode: eventPayment.errorCode,
        },
      });
    }
    // A failure older than a charge we already applied is stale; so is any failure of a payment we
    // know was captured. A failed first attempt in Checkout (status created) is the buyer's to retry.
    if (existing && existing.status !== 'failed')
      return { status: 'ignored', note: 'payment not failed' };
    if (sub.lastChargeEventAt && occurredAt <= sub.lastChargeEventAt) {
      return { status: 'ignored', note: 'older than the latest charge' };
    }
    if (sub.status === 'active') await enterGrace(tx, sub, occurredAt);
    return { status: 'processed' };
  }

  private async applyHalted(tx: Tx, data: EventData, occurredAt: Date): Promise<Outcome> {
    if (!data.subscription) return { status: 'ignored', note: 'malformed' };
    const sub = await lockSubscription(tx, { providerSubscriptionId: data.subscription.id });
    if (!sub) return { status: 'ignored', note: 'unknown subscription' };
    if (sub.lastChargeEventAt && occurredAt <= sub.lastChargeEventAt) {
      return { status: 'ignored', note: 'older than the latest charge' };
    }
    // Razorpay stopped retrying: the grace period runs out on its own (the hourly expiry job).
    if (sub.status === 'active') await enterGrace(tx, sub, occurredAt);
    return { status: 'processed' };
  }

  private async applyCancelled(tx: Tx, data: EventData, occurredAt: Date): Promise<Outcome> {
    if (!data.subscription) return { status: 'ignored', note: 'malformed' };
    const sub = await lockSubscription(tx, { providerSubscriptionId: data.subscription.id });
    if (!sub) return { status: 'ignored', note: 'unknown subscription' };
    if (sub.status === 'ended') return { status: 'processed', note: 'already ended' };
    if (sub.status === 'created') {
      await endSubscription(tx, sub, 'abandoned', occurredAt);
      return { status: 'processed' };
    }
    // Auto-renew is off; the paid period (or grace) still runs to its end.
    await tx.subscription.update({
      where: { id: sub.id },
      data: { cancelAtPeriodEnd: true, cancelledAt: sub.cancelledAt ?? occurredAt },
    });
    return { status: 'processed' };
  }

  private async applyRefund(tx: Tx, data: EventData, occurredAt: Date): Promise<Outcome> {
    const refund = data.refund;
    if (!refund) return { status: 'ignored', note: 'malformed' };
    const payment = await tx.payment.findUnique({ where: { providerPaymentId: refund.paymentId } });
    // The refund can outrun the charge delivery: fail so the queue retries until it is there.
    if (!payment) throw new Error('refund for a payment that is not recorded yet');
    if (payment.status === 'refunded') return { status: 'processed', note: 'already refunded' };
    if (payment.status === 'failed') return { status: 'ignored', note: 'payment was not captured' };
    await tx.payment.update({
      where: { id: payment.id },
      data: { status: 'refunded', refundedAt: occurredAt, providerRefundId: refund.id },
    });
    if (!payment.isFirst) return { status: 'processed' };

    const sub: SubscriptionRow | null = await lockSubscription(tx, { id: payment.subscriptionId });
    if (sub && sub.status !== 'ended') await endSubscription(tx, sub, 'refunded', occurredAt);
    const business = await tx.business.findUniqueOrThrow({
      where: { id: payment.businessId },
      select: { ownerUserId: true },
    });
    await recordEvent(tx, 'premium.refunded', {
      businessId: payment.businessId,
      userId: business.ownerUserId,
      paymentId: payment.id,
      amountPaise: Number(payment.amountPaise),
      currency: 'INR',
      occurredAt: occurredAt.toISOString(),
    });
    return { status: 'processed' };
  }
}
