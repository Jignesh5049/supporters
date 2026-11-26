import { randomUUID } from 'node:crypto';
import type { PaymentsProvider, ProviderSubscription } from './provider';
import { signWebhookBody } from './signature';

/**
 * An in-memory Razorpay for tests and local development: `PAYMENTS_PROVIDER=fake`, refused in
 * staging and production. It never makes a network call. It also builds signed webhook deliveries
 * in Razorpay's payload shape, so tests and the dev checkout page exercise the real webhook path.
 */
export class FakeRazorpay implements PaymentsProvider {
  readonly name = 'fake' as const;
  readonly keyId = 'rzp_test_fakefakefake';
  readonly subscriptions = new Map<string, ProviderSubscription & { reference: string }>();
  readonly payments = new Map<string, string>();
  readonly refunds: { id: string; paymentId: string; amountPaise: number; reference: string }[] =
    [];
  readonly cancellations: { id: string; atCycleEnd: boolean }[] = [];
  /** Set to make the next call of that method throw, like a provider outage. */
  failNext: 'createSubscription' | 'refundPayment' | 'cancelSubscription' | null = null;

  private maybeFail(method: NonNullable<FakeRazorpay['failNext']>) {
    if (this.failNext === method) {
      this.failNext = null;
      throw new Error(`fake provider: ${method} failed`);
    }
  }

  async createSubscription(input: { reference: string; businessId: string }) {
    this.maybeFail('createSubscription');
    const id = `sub_fake${randomUUID().replaceAll('-', '').slice(0, 14)}`;
    this.subscriptions.set(id, {
      id,
      status: 'created',
      currentStart: null,
      currentEnd: null,
      reference: input.reference,
    });
    return { id };
  }

  async fetchSubscription(id: string) {
    const subscription = this.subscriptions.get(id);
    if (!subscription) throw new Error('fake provider: unknown subscription');
    return subscription;
  }

  async cancelSubscription(id: string, atCycleEnd: boolean) {
    this.maybeFail('cancelSubscription');
    this.cancellations.push({ id, atCycleEnd });
    const subscription = this.subscriptions.get(id);
    if (subscription && !atCycleEnd) subscription.status = 'cancelled';
  }

  async findSubscriptionOfPayment(paymentId: string) {
    return this.payments.get(paymentId) ?? null;
  }

  async refundPayment(paymentId: string, amountPaise: number, options: { reference: string }) {
    this.maybeFail('refundPayment');
    const existing = this.refunds.find((refund) => refund.reference === options.reference);
    if (existing) return { id: existing.id };
    const id = `rfnd_fake${randomUUID().replaceAll('-', '').slice(0, 14)}`;
    this.refunds.push({ id, paymentId, amountPaise, reference: options.reference });
    return { id };
  }
}

export interface SignedWebhook {
  eventId: string;
  body: string;
  signature: string;
  headers: Record<string, string>;
}

const seconds = (date: Date) => Math.floor(date.getTime() / 1000);

interface WebhookOptions {
  eventId?: string;
  createdAt?: Date;
}

/** Signs a Razorpay-shaped event the way Razorpay would deliver it. */
export function signedWebhook(
  secret: string,
  event: string,
  payload: Record<string, unknown>,
  options: WebhookOptions = {},
): SignedWebhook {
  const eventId = options.eventId ?? `evt_fake${randomUUID().replaceAll('-', '').slice(0, 14)}`;
  const body = JSON.stringify({
    entity: 'event',
    account_id: 'acc_fake',
    event,
    contains: Object.keys(payload),
    payload,
    created_at: seconds(options.createdAt ?? new Date()),
  });
  const signature = signWebhookBody(body, secret);
  return {
    eventId,
    body,
    signature,
    headers: {
      'content-type': 'application/json',
      'x-razorpay-signature': signature,
      'x-razorpay-event-id': eventId,
    },
  };
}

export interface ChargedInput {
  providerSubscriptionId: string;
  providerPaymentId: string;
  amountPaise: number;
  periodStart: Date;
  periodEnd: Date;
}

/** `subscription.charged`: the payment was captured and the period moved. */
export const chargedEvent = (secret: string, input: ChargedInput, options: WebhookOptions = {}) =>
  signedWebhook(
    secret,
    'subscription.charged',
    {
      subscription: {
        entity: {
          id: input.providerSubscriptionId,
          status: 'active',
          current_start: seconds(input.periodStart),
          current_end: seconds(input.periodEnd),
        },
      },
      payment: {
        entity: {
          id: input.providerPaymentId,
          amount: input.amountPaise,
          currency: 'INR',
          status: 'captured',
          // Customer details the real payload carries; the receiver must not keep them.
          email: 'buyer@example.com',
          contact: '+919800000000',
        },
      },
    },
    options,
  );

export const paymentFailedEvent = (
  secret: string,
  input: { providerPaymentId: string; amountPaise: number; providerSubscriptionId?: string },
  options: WebhookOptions = {},
) =>
  signedWebhook(
    secret,
    'payment.failed',
    {
      payment: {
        entity: {
          id: input.providerPaymentId,
          amount: input.amountPaise,
          currency: 'INR',
          status: 'failed',
          error_code: 'BAD_REQUEST_ERROR',
          ...(input.providerSubscriptionId
            ? { notes: { subscription_id: input.providerSubscriptionId } }
            : {}),
        },
      },
    },
    options,
  );

export const subscriptionStatusEvent = (
  secret: string,
  event: 'subscription.halted' | 'subscription.cancelled',
  providerSubscriptionId: string,
  options: WebhookOptions = {},
) =>
  signedWebhook(
    secret,
    event,
    {
      subscription: {
        entity: {
          id: providerSubscriptionId,
          status: event === 'subscription.halted' ? 'halted' : 'cancelled',
        },
      },
    },
    options,
  );

export const refundProcessedEvent = (
  secret: string,
  input: { providerRefundId: string; providerPaymentId: string; amountPaise: number },
  options: WebhookOptions = {},
) =>
  signedWebhook(
    secret,
    'refund.processed',
    {
      refund: {
        entity: {
          id: input.providerRefundId,
          payment_id: input.providerPaymentId,
          amount: input.amountPaise,
          currency: 'INR',
          status: 'processed',
        },
      },
    },
    options,
  );
