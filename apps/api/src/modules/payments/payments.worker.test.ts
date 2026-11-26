import { randomUUID } from 'node:crypto';
import { Queue } from 'bullmq';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { type NotificationWorker, QUEUE, startNotificationWorker } from '../../jobs/worker';
import { type ReferenceData, referenceData } from '../../test/catalog';
import { type TestContext, createTestApp, prisma, resetState, valkey } from '../../test/helpers';
import { FakeEmail, FakeExpo } from '../../test/notifications';
import {
  DAY_MS,
  type PremiumOwner,
  deliver,
  nextPaymentId,
  premiumOwner,
  startCheckout,
  webhookSecret,
} from '../../test/payments';
import { chargedEvent, refundProcessedEvent } from './fake-razorpay';

let ctx: TestContext;
let refs: ReferenceData;
let worker: NotificationWorker | undefined;
let prefix: string;
let owner: PremiumOwner;

beforeAll(async () => {
  ctx = await createTestApp();
  refs = await referenceData();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(resetState);
beforeEach(async () => {
  prefix = `test-${randomUUID()}`;
  owner = await premiumOwner(ctx, refs);
  worker = await startNotificationWorker({
    env: ctx.env,
    prisma,
    valkey,
    expo: new FakeExpo(),
    webPush: null,
    email: new FakeEmail(),
    payments: {
      provider: ctx.app.services.payments.provider,
      invoices: ctx.app.services.invoices,
    },
    log: ctx.app.log,
    backoffMs: 5,
    relayIntervalMs: 20,
    prefix,
    isCleanupScheduled: false,
  });
});
// Close before the next test's reset, so no job writes while the tables are truncated.
afterEach(async () => {
  await worker?.close();
  worker = undefined;
});

describe('the payments queue', () => {
  it('relays a verified webhook, activates Premium, then renders the invoice PDF', async () => {
    const { checkout } = await startCheckout(ctx, owner);
    const delivery = chargedEvent(webhookSecret(ctx), {
      providerSubscriptionId: checkout.providerSubscriptionId,
      providerPaymentId: nextPaymentId(),
      amountPaise: 99_900,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 365 * DAY_MS),
    });
    // The route answers at once; everything else happens in the queue.
    expect((await deliver(ctx, delivery)).statusCode).toBe(200);
    expect(await prisma.subscription.count({ where: { status: 'active' } })).toBe(0);

    await vi.waitFor(
      async () => {
        expect(await prisma.subscription.count({ where: { status: 'active' } })).toBe(1);
        expect((await prisma.invoice.findFirstOrThrow()).pdfKey).not.toBeNull();
      },
      { timeout: 15_000, interval: 50 },
    );
    expect((await prisma.webhookEvent.findFirstOrThrow()).status).toBe('processed');
    // Payments events never reach the notification fan-out queue.
    const fanout = new Queue(QUEUE.notifications, { connection: valkey, prefix });
    try {
      const jobs = await fanout.getJobs(['waiting', 'active', 'completed', 'failed']);
      const payload = await prisma.outboxEvent.findMany({
        where: { type: { startsWith: 'payments.' } },
        select: { id: true, processedAt: true },
      });
      expect(payload.length).toBeGreaterThan(0);
      expect(jobs.map((job) => job.id)).not.toEqual(
        expect.arrayContaining(payload.map((row) => `evt-${row.id}`)),
      );
    } finally {
      await fanout.close();
    }
  });

  it('retries a failing event 10 times, then dead-letters it with ids only', async () => {
    // A refund for a payment that never arrives fails every time.
    const delivery = refundProcessedEvent(webhookSecret(ctx), {
      providerRefundId: 'rfnd_neverarrives1',
      providerPaymentId: 'pay_neverarrives1',
      amountPaise: 99_900,
    });
    expect((await deliver(ctx, delivery)).statusCode).toBe(200);

    const deadLetters = new Queue(QUEUE.deadLetter, { connection: valkey, prefix });
    try {
      await vi.waitFor(
        async () => expect((await deadLetters.getJobs(['waiting'])).length).toBeGreaterThan(0),
        { timeout: 20_000, interval: 100 },
      );
      const [letter] = await deadLetters.getJobs(['waiting']);
      expect(letter?.data).toMatchObject({
        queue: 'payments',
        name: 'webhook',
        attemptsMade: 10,
        failedReason: expect.stringContaining('not recorded yet'),
      });
      expect(JSON.stringify(letter?.data)).not.toContain('pay_neverarrives1');
    } finally {
      await deadLetters.close();
    }
    expect((await prisma.webhookEvent.findFirstOrThrow()).status).toBe('failed');
  });
});
