import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { type ReferenceData, referenceData } from '../../test/catalog';
import {
  type TestContext,
  createTestApp,
  prisma,
  problemCode,
  resetState,
} from '../../test/helpers';
import {
  DAY_MS,
  type PremiumOwner,
  charge,
  deliver,
  nextPaymentId,
  premiumOwner,
  processPayments,
  startCheckout,
  webhookSecret,
} from '../../test/payments';
import {
  chargedEvent,
  paymentFailedEvent,
  refundProcessedEvent,
  signedWebhook,
  subscriptionStatusEvent,
} from './fake-razorpay';
import { signWebhookBody, verifyWebhookSignature } from './signature';

const HOUR_MS = 3_600_000;

let ctx: TestContext;
let refs: ReferenceData;
let owner: PremiumOwner;
let providerSubscriptionId: string;

beforeAll(async () => {
  ctx = await createTestApp();
  refs = await referenceData();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(resetState);
beforeEach(async () => {
  owner = await premiumOwner(ctx, refs);
  ({
    checkout: { providerSubscriptionId },
  } = await startCheckout(ctx, owner));
});

const secret = () => webhookSecret(ctx);
const charged = (options = {}) =>
  chargedEvent(
    secret(),
    {
      providerSubscriptionId,
      providerPaymentId: nextPaymentId(),
      amountPaise: 99_900,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 365 * DAY_MS),
    },
    options,
  );
const payments = () => prisma.payment.count();

describe('signature verification', () => {
  it('accepts a correctly signed raw body', async () => {
    const response = await deliver(ctx, charged());
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ received: true });
    expect(await prisma.webhookEvent.count()).toBe(1);
  });

  it('refuses a wrong signature, and stores nothing', async () => {
    const delivery = charged();
    const response = await deliver(ctx, {
      ...delivery,
      headers: { ...delivery.headers, 'x-razorpay-signature': 'a'.repeat(64) },
    });
    expect(response.statusCode).toBe(400);
    expect(problemCode(response)).toBe('INVALID_WEBHOOK');
    expect(await prisma.webhookEvent.count()).toBe(0);
  });

  it('refuses a signature made with another secret', async () => {
    const forged = chargedEvent('whsec_attacker_secret_0123456789', {
      providerSubscriptionId,
      providerPaymentId: nextPaymentId(),
      amountPaise: 99_900,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 365 * DAY_MS),
    });
    expect((await deliver(ctx, forged)).statusCode).toBe(400);
    expect(await prisma.webhookEvent.count()).toBe(0);
  });

  it('refuses a body changed after signing (tampered amount)', async () => {
    const delivery = charged();
    const tampered = delivery.body.replace('"amount":99900', '"amount":1');
    expect(tampered).not.toBe(delivery.body);
    const response = await deliver(ctx, { ...delivery, body: tampered });
    expect(response.statusCode).toBe(400);
  });

  it('verifies the raw bytes: the same JSON with different whitespace is a different body', async () => {
    const delivery = charged();
    const reformatted = JSON.stringify(JSON.parse(delivery.body), null, 2);
    expect((await deliver(ctx, { ...delivery, body: reformatted })).statusCode).toBe(400);
  });

  it('refuses a missing or malformed signature header, and a missing event id', async () => {
    const delivery = charged();
    const withoutSignature = { ...delivery.headers };
    delete withoutSignature['x-razorpay-signature'];
    expect((await deliver(ctx, { ...delivery, headers: withoutSignature })).statusCode).toBe(400);
    expect(
      (
        await deliver(ctx, {
          ...delivery,
          headers: { ...delivery.headers, 'x-razorpay-signature': 'not-hex' },
        })
      ).statusCode,
    ).toBe(400);
    const withoutEventId = { ...delivery.headers };
    delete withoutEventId['x-razorpay-event-id'];
    expect((await deliver(ctx, { ...delivery, headers: withoutEventId })).statusCode).toBe(400);
    expect(await prisma.webhookEvent.count()).toBe(0);
  });

  it('compares in constant time: a short or long signature never throws', () => {
    const body = Buffer.from('{"a":1}');
    const good = signWebhookBody(body, secret());
    expect(verifyWebhookSignature(body, good, secret())).toBe(true);
    expect(verifyWebhookSignature(body, good.slice(0, 62), secret())).toBe(false);
    expect(verifyWebhookSignature(body, `${good}00`, secret())).toBe(false);
    expect(verifyWebhookSignature(body, undefined, secret())).toBe(false);
    expect(verifyWebhookSignature(body, good.toUpperCase(), secret())).toBe(true);
  });

  it('refuses a stale event (older than the tolerance) even with a valid signature', async () => {
    const old = charged({ createdAt: new Date(Date.now() - 26 * 3_600_000) });
    const response = await deliver(ctx, old);
    expect(response.statusCode).toBe(400);
    expect(await prisma.webhookEvent.count()).toBe(0);
  });

  it('accepts a retry within the 24 h Razorpay retry window', async () => {
    const retried = charged({ createdAt: new Date(Date.now() - 23 * 3_600_000) });
    expect((await deliver(ctx, retried)).statusCode).toBe(200);
  });

  it('refuses an event dated in the future', async () => {
    const future = charged({ createdAt: new Date(Date.now() + 3_600_000) });
    expect((await deliver(ctx, future)).statusCode).toBe(400);
  });

  it('refuses a signed body that is not a Razorpay event', async () => {
    const body = JSON.stringify({ hello: 'world' });
    const response = await deliver(ctx, {
      body,
      headers: {
        'content-type': 'application/json',
        'x-razorpay-signature': signWebhookBody(body, secret()),
        'x-razorpay-event-id': 'evt_00000001',
      },
    });
    expect(response.statusCode).toBe(400);
  });

  it('answers 503 when payments are not configured', async () => {
    const bare = await createTestApp({ PAYMENTS_PROVIDER: 'none' });
    try {
      const response = await bare.app.inject({
        method: 'POST',
        url: '/v1/webhooks/razorpay',
        headers: { 'content-type': 'application/json' },
        payload: '{}',
      });
      expect(response.statusCode).toBe(503);
      expect(problemCode(response)).toBe('PAYMENTS_NOT_CONFIGURED');
    } finally {
      await bare.app.close();
    }
  });
});

describe('replay protection and idempotency', () => {
  it('acknowledges a replayed delivery and applies it once', async () => {
    const delivery = charged();
    expect((await deliver(ctx, delivery)).statusCode).toBe(200);
    await processPayments(ctx);
    expect((await deliver(ctx, delivery)).statusCode).toBe(200);
    expect((await deliver(ctx, delivery)).statusCode).toBe(200);
    await processPayments(ctx);

    expect(await prisma.webhookEvent.count()).toBe(1);
    expect(await payments()).toBe(1);
    expect(await prisma.invoice.count()).toBe(1);
    expect(await prisma.outboxEvent.count({ where: { type: 'premium.activated' } })).toBe(1);
  });

  it('applies a payment once even when Razorpay sends it under a new event id', async () => {
    const paymentId = nextPaymentId();
    for (let i = 0; i < 2; i += 1) {
      await charge(ctx, providerSubscriptionId, { providerPaymentId: paymentId });
    }
    expect(await payments()).toBe(1);
    expect(await prisma.invoice.count()).toBe(1);
    expect(await prisma.outboxEvent.count({ where: { type: 'premium.activated' } })).toBe(1);
  });

  it('survives concurrent delivery of the same event: one row, one application', async () => {
    const delivery = charged();
    const responses = await Promise.all(Array.from({ length: 8 }, () => deliver(ctx, delivery)));
    expect(responses.every((response) => response.statusCode === 200)).toBe(true);
    expect(await prisma.webhookEvent.count()).toBe(1);
    expect(await prisma.outboxEvent.count({ where: { type: 'payments.webhook' } })).toBe(1);

    const [row] = await prisma.webhookEvent.findMany();
    // Two workers picking the same job at once still apply it once.
    const results = await Promise.all(
      Array.from({ length: 4 }, () => ctx.app.services.payments.processor.process(row?.id ?? '')),
    );
    expect(results.filter((result) => result === 'processed')).toHaveLength(1);
    expect(await payments()).toBe(1);
    expect(await prisma.invoice.count()).toBe(1);
  });

  it('acknowledges and logs an unknown event with no side effect', async () => {
    const unknown = signedWebhook(secret(), 'payout.processed', {
      payout: { entity: { id: 'x' } },
    });
    const response = await deliver(ctx, unknown);
    expect(response.statusCode).toBe(200);
    const row = await prisma.webhookEvent.findFirstOrThrow();
    expect(row).toMatchObject({ type: 'payout.processed', status: 'ignored', data: {} });
    expect(await prisma.outboxEvent.count({ where: { type: 'payments.webhook' } })).toBe(0);
    expect(await payments()).toBe(0);
  });

  it('keeps no customer contact details from the payload', async () => {
    await deliver(ctx, charged());
    const row = await prisma.webhookEvent.findFirstOrThrow();
    const stored = JSON.stringify(row.data);
    expect(stored).not.toContain('buyer@example.com');
    expect(stored).not.toContain('+919800000000');
  });

  it('ignores a subscription that is not ours, and a charge for the wrong amount', async () => {
    await deliver(
      ctx,
      chargedEvent(secret(), {
        providerSubscriptionId: 'sub_someone_else',
        providerPaymentId: nextPaymentId(),
        amountPaise: 99_900,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 365 * DAY_MS),
      }),
    );
    await deliver(
      ctx,
      chargedEvent(secret(), {
        providerSubscriptionId,
        providerPaymentId: nextPaymentId(),
        amountPaise: 100,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 365 * DAY_MS),
      }),
    );
    await processPayments(ctx);
    expect(await payments()).toBe(0);
    const business = await prisma.business.findUniqueOrThrow({ where: { id: owner.businessId } });
    expect(business.premiumUntil).toBeNull();
    const statuses = await prisma.webhookEvent.findMany({
      select: { status: true, lastError: true },
    });
    expect(statuses.map((s) => s.lastError).sort()).toEqual([
      'amount mismatch',
      'unknown subscription',
    ]);
  });
});

describe('out-of-order delivery', () => {
  it('ignores a failure older than a charge that was already applied', async () => {
    const t0 = Date.now();
    await charge(ctx, providerSubscriptionId, { createdAt: new Date(t0) });
    await deliver(
      ctx,
      paymentFailedEvent(
        secret(),
        { providerPaymentId: nextPaymentId(), amountPaise: 99_900, providerSubscriptionId },
        { createdAt: new Date(t0 - 60_000) },
      ),
    );
    await processPayments(ctx);
    const sub = await prisma.subscription.findFirstOrThrow();
    expect(sub.status).toBe('active');
    expect(sub.graceEndsAt).toBeNull();
  });

  it('does not let a late charge cancel the grace a newer failure started', async () => {
    const t0 = Date.now();
    await charge(ctx, providerSubscriptionId, { createdAt: new Date(t0 - 3 * HOUR_MS) });
    // The renewal's failure (newer) arrives first, then the older renewal-charge event.
    await deliver(
      ctx,
      paymentFailedEvent(
        secret(),
        { providerPaymentId: nextPaymentId(), amountPaise: 99_900, providerSubscriptionId },
        { createdAt: new Date(t0) },
      ),
    );
    await processPayments(ctx);
    expect((await prisma.subscription.findFirstOrThrow()).status).toBe('past_due');
    await charge(ctx, providerSubscriptionId, {
      createdAt: new Date(t0 - 2 * HOUR_MS),
      periodEnd: new Date(t0 + 400 * DAY_MS),
    });
    const sub = await prisma.subscription.findFirstOrThrow();
    expect(sub.status).toBe('past_due');
    expect(sub.graceEndsAt).not.toBeNull();
  });

  it('never moves the paid period backwards', async () => {
    const t0 = Date.now();
    await charge(ctx, providerSubscriptionId, {
      createdAt: new Date(t0),
      periodEnd: new Date(t0 + 730 * DAY_MS),
    });
    await charge(ctx, providerSubscriptionId, {
      createdAt: new Date(t0 - 1000),
      periodEnd: new Date(t0 + 365 * DAY_MS),
    });
    const sub = await prisma.subscription.findFirstOrThrow();
    expect(sub.currentPeriodEnd?.getTime()).toBe(Math.floor((t0 + 730 * DAY_MS) / 1000) * 1000);
  });

  it('retries a refund that outran its charge, then applies it', async () => {
    const paymentId = nextPaymentId();
    await deliver(
      ctx,
      refundProcessedEvent(secret(), {
        providerRefundId: 'rfnd_early00001',
        providerPaymentId: paymentId,
        amountPaise: 99_900,
      }),
    );
    await expect(processPayments(ctx)).rejects.toThrow('not recorded yet');
    expect((await prisma.webhookEvent.findFirstOrThrow()).status).toBe('failed');

    await deliver(
      ctx,
      chargedEvent(secret(), {
        providerSubscriptionId,
        providerPaymentId: paymentId,
        amountPaise: 99_900,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 365 * DAY_MS),
      }),
    );
    await processPayments(ctx, ['received']);
    // The queue's retry of the refund.
    await processPayments(ctx, ['failed']);
    expect((await prisma.payment.findFirstOrThrow()).status).toBe('refunded');
    expect((await prisma.subscription.findFirstOrThrow()).status).toBe('ended');
  });

  it('closes an unpaid checkout when Razorpay reports it cancelled', async () => {
    await deliver(
      ctx,
      subscriptionStatusEvent(secret(), 'subscription.cancelled', providerSubscriptionId),
    );
    await processPayments(ctx);
    expect(await prisma.subscription.findFirstOrThrow()).toMatchObject({
      status: 'ended',
      endedReason: 'abandoned',
    });
  });
});
