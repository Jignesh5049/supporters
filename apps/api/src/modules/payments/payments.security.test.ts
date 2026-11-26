import pino from 'pino';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { REDACT_PATHS } from '../../app';
import { type ReferenceData, referenceData } from '../../test/catalog';
import { createTestApp, prisma, resetState } from '../../test/helpers';
import {
  api,
  buyPremium,
  deliver,
  premiumOwner,
  startCheckout,
  webhookSecret,
} from '../../test/payments';
import { chargedEvent } from './fake-razorpay';

const KEY_SECRET = 'sk_test_do_not_leak_0123456789';
const WEBHOOK_SECRET = 'whsec_do_not_leak_0123456789abcdef';

describe('what responses and logs reveal', () => {
  let refs: ReferenceData;
  const logLines: string[] = [];
  let ctx: Awaited<ReturnType<typeof createTestApp>>;

  beforeAll(async () => {
    refs = await referenceData();
    ctx = await createTestApp(
      { RAZORPAY_KEY_SECRET: KEY_SECRET, RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET },
      undefined,
      {
        logger: {
          level: 'trace',
          redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
          stream: { write: (line: string) => void logLines.push(line) },
        },
      },
    );
  });
  afterAll(async () => {
    await ctx.app.close();
  });
  beforeEach(resetState);

  it('keeps provider secrets, signatures and customer details out of every response and log line', async () => {
    const owner = await premiumOwner(ctx, refs);
    const bodies: string[] = [];
    const record = (response: { body: string }) => {
      bodies.push(response.body);
      return response;
    };

    const { subscriptionId, providerSubscriptionId } = await buyPremium(ctx, owner);
    expect(subscriptionId).toBeTruthy();
    await startCheckout(ctx, owner).catch(() => undefined);
    // A forged delivery, a replay and a good one, so the webhook paths all log.
    const delivery = chargedEvent(webhookSecret(ctx), {
      providerSubscriptionId,
      providerPaymentId: 'pay_leakcheck0001',
      amountPaise: 99_900,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 365 * 86_400_000),
    });
    record(
      await deliver(ctx, {
        ...delivery,
        headers: { ...delivery.headers, 'x-razorpay-signature': 'b'.repeat(64) },
      }),
    );
    record(await deliver(ctx, delivery));
    record(await deliver(ctx, delivery));

    record(await api(ctx, 'GET', '/v1/me/business/premium', { as: owner.session }));
    record(await api(ctx, 'GET', '/v1/me/business/invoices', { as: owner.session }));
    const invoice = await prisma.invoice.findFirstOrThrow();
    record(await api(ctx, 'GET', `/v1/me/business/invoices/${invoice.id}`, { as: owner.session }));
    const checkout = await api(ctx, 'POST', '/v1/me/business/premium/checkout', {
      as: owner.session,
      body: {},
      headers: { 'idempotency-key': crypto.randomUUID() },
    });
    record(checkout);

    const everything = [...bodies, ...logLines].join('\n');
    for (const secret of [KEY_SECRET, WEBHOOK_SECRET, delivery.signature, 'b'.repeat(64)]) {
      expect(everything, secret).not.toContain(secret);
    }
    expect(everything).not.toContain('buyer@example.com');
    expect(everything).not.toContain('+919800000000');
    // The webhook body is never logged, only ids and the reason it was refused.
    expect(logLines.join('')).not.toContain('subscription.charged');
    // What Checkout gets back is the public key id only.
    expect(JSON.stringify(checkout.json())).not.toMatch(/secret/i);
  });

  it('censors payment credentials in structured logs at any depth', () => {
    const lines: string[] = [];
    const log = pino(
      { redact: { paths: REDACT_PATHS, censor: '[REDACTED]' } },
      { write: (line: string) => void lines.push(line) },
    );
    log.info(
      {
        config: { keySecret: KEY_SECRET, webhookSecret: WEBHOOK_SECRET },
        req: { headers: { 'x-razorpay-signature': 'c'.repeat(64) } },
        deep: { a: { signature: 'd'.repeat(64) } },
      },
      'payments',
    );
    const line = lines.join('');
    for (const secret of [KEY_SECRET, WEBHOOK_SECRET, 'c'.repeat(64), 'd'.repeat(64)]) {
      expect(line, secret).not.toContain(secret);
    }
  });
});
