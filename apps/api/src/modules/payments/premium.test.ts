import { randomUUID } from 'node:crypto';
import { PLAN_LIMITS, PREMIUM } from '@supporters/shared';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { adminBrowser, enrolAdmin } from '../../test/admin';
import { type ReferenceData, referenceData } from '../../test/catalog';
import {
  type TestContext,
  createTestApp,
  prisma,
  problemCode,
  registerMobile,
  resetState,
} from '../../test/helpers';
import { drainOutbox, outboxOf } from '../../test/notifications';
import {
  DAY_MS,
  type PremiumOwner,
  api,
  buyPremium,
  charge,
  deliver,
  nextPaymentId,
  premiumOwner,
  processPayments,
  providerOf,
  startCheckout,
  webhookSecret,
} from '../../test/payments';
import { paymentFailedEvent, refundProcessedEvent } from './fake-razorpay';
import { PremiumLifecycle } from './lifecycle';

let ctx: TestContext;
let refs: ReferenceData;
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
  providerOf(ctx).subscriptions.clear();
  providerOf(ctx).refunds.length = 0;
  providerOf(ctx).cancellations.length = 0;
  owner = await premiumOwner(ctx, refs);
});

const lifecycle = () => new PremiumLifecycle(prisma, providerOf(ctx), ctx.app.log);
const status = async (as = owner.session) =>
  (await api(ctx, 'GET', '/v1/me/business/premium', { as })).json<Record<string, unknown>>();
const business = () => prisma.business.findUniqueOrThrow({ where: { id: owner.businessId } });
const sub = () => prisma.subscription.findFirstOrThrow({ where: { businessId: owner.businessId } });
const events = async (type: string) => (await outboxOf(type)).map((row) => row.payload);

/** Moves the paid period to `end` (a simulated clock) in both the subscription and the perk gate. */
async function setPeriodEnd(end: Date, extra: object = {}) {
  await prisma.subscription.updateMany({
    where: { businessId: owner.businessId },
    data: {
      currentPeriodEnd: end,
      currentPeriodStart: new Date(end.getTime() - 365 * DAY_MS),
      ...extra,
    },
  });
  await prisma.business.update({ where: { id: owner.businessId }, data: { premiumUntil: end } });
}

describe('checkout', () => {
  const checkout = (as = owner.session, headers: Record<string, string> = {}, body: object = {}) =>
    api(ctx, 'POST', '/v1/me/business/premium/checkout', {
      as,
      body,
      headers: { 'idempotency-key': randomUUID(), ...headers },
    });

  it('creates a Razorpay Subscription and returns only what Checkout needs', async () => {
    const response = await checkout();
    expect(response.statusCode).toBe(201);
    const body = response.json<{
      subscriptionId: string;
      provider: string;
      checkout: { keyId: string; providerSubscriptionId: string };
      price: object;
    }>();
    expect(body).toEqual({
      subscriptionId: expect.any(String),
      provider: 'fake',
      checkout: {
        keyId: 'rzp_test_fakefakefake',
        providerSubscriptionId: expect.stringMatching(/^sub_/),
      },
      price: { amountPaise: 99_900, currency: 'INR' },
    });
    expect(providerOf(ctx).subscriptions.size).toBe(1);
    // Nothing is Premium until a verified webhook says so.
    expect(await status()).toMatchObject({ state: 'pending', isPremium: false });
    expect((await business()).premiumUntil).toBeNull();
  });

  it('refuses the mobile app, before anything else', async () => {
    const response = await api(ctx, 'POST', '/v1/me/business/premium/checkout', {
      as: owner.session,
      client: 'mobile',
      body: {},
    });
    expect(response.statusCode).toBe(403);
    expect(problemCode(response)).toBe('PREMIUM_WEB_ONLY');
    expect(providerOf(ctx).subscriptions.size).toBe(0);
  });

  it('needs an Idempotency-Key and a signed-in owner of a business', async () => {
    const noKey = await api(ctx, 'POST', '/v1/me/business/premium/checkout', {
      as: owner.session,
      body: {},
    });
    expect(noKey.statusCode).toBe(400);
    const guest = await api(ctx, 'POST', '/v1/me/business/premium/checkout', {
      body: {},
      headers: { 'idempotency-key': randomUUID() },
    });
    expect(guest.statusCode).toBe(401);
    const noBusiness = await checkout(await registerMobile(ctx));
    expect(noBusiness.statusCode).toBe(403);
    expect(problemCode(noBusiness)).toBe('BUSINESS_REQUIRED');
    expect((await checkout(owner.session, {}, { gstin: 'x' })).statusCode).toBe(400);
    expect((await checkout(owner.session, {}, { buyerGstin: 'not-a-gstin' })).statusCode).toBe(400);
  });

  it('is idempotent: the same key and body return the same subscription', async () => {
    const key = randomUUID();
    const first = await checkout(owner.session, { 'idempotency-key': key });
    const second = await checkout(owner.session, { 'idempotency-key': key });
    expect(second.statusCode).toBe(200);
    expect(second.json()).toEqual(first.json());
    expect(providerOf(ctx).subscriptions.size).toBe(1);
    expect(await prisma.subscription.count()).toBe(1);
  });

  it('refuses the same key for a different body', async () => {
    const key = randomUUID();
    await checkout(owner.session, { 'idempotency-key': key });
    const other = await checkout(
      owner.session,
      { 'idempotency-key': key },
      { buyerGstin: '27AAPFU0939F1ZV' },
    );
    expect(other.statusCode).toBe(422);
    expect(problemCode(other)).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('resumes an unpaid checkout with a new key instead of opening a second subscription', async () => {
    const first = await checkout();
    const second = await checkout();
    expect(second.json<{ subscriptionId: string }>().subscriptionId).toBe(
      first.json<{ subscriptionId: string }>().subscriptionId,
    );
    expect(providerOf(ctx).subscriptions.size).toBe(1);
  });

  it('never creates two provider subscriptions for parallel taps', async () => {
    const key = randomUUID();
    const results = await Promise.all(
      Array.from({ length: 6 }, () => checkout(owner.session, { 'idempotency-key': key })),
    );
    expect(results.every((r) => [200, 201, 409].includes(r.statusCode))).toBe(true);
    expect(providerOf(ctx).subscriptions.size).toBe(1);
    expect(await prisma.subscription.count()).toBe(1);
  });

  it('refuses a second checkout while Premium is active', async () => {
    await buyPremium(ctx, owner);
    const again = await checkout();
    expect(again.statusCode).toBe(409);
    expect(problemCode(again)).toBe('PREMIUM_EXISTS');
  });

  it('answers 503 and stores nothing when the provider is down', async () => {
    providerOf(ctx).failNext = 'createSubscription';
    const response = await checkout();
    expect(response.statusCode).toBe(503);
    expect(await prisma.subscription.count()).toBe(0);
  });

  it('answers 503 PAYMENTS_NOT_CONFIGURED without a provider, and the app still boots', async () => {
    const bare = await createTestApp({ PAYMENTS_PROVIDER: 'none' });
    try {
      const mine = await premiumOwner(bare, refs);
      for (const [method, url] of [
        ['POST', '/v1/me/business/premium/checkout'],
        ['POST', '/v1/me/business/premium/cancel'],
      ] as const) {
        const response = await api(bare, method, url, {
          as: mine.session,
          body: {},
          headers: { 'idempotency-key': randomUUID() },
        });
        expect(response.statusCode, url).toBe(503);
        expect(problemCode(response)).toBe('PAYMENTS_NOT_CONFIGURED');
      }
      // Status is read from the database and still works.
      const read = await api(bare, 'GET', '/v1/me/business/premium', { as: mine.session });
      expect(read.json()).toMatchObject({ state: 'none', isPremium: false });
    } finally {
      await bare.app.close();
    }
  });
});

describe('status', () => {
  it('is for the owner only', async () => {
    expect((await api(ctx, 'GET', '/v1/me/business/premium')).statusCode).toBe(401);
    const stranger = await registerMobile(ctx);
    expect((await api(ctx, 'GET', '/v1/me/business/premium', { as: stranger })).statusCode).toBe(
      403,
    );
    const other = await premiumOwner(ctx, refs);
    await buyPremium(ctx, other);
    // The first owner sees their own free state, not the other business's.
    expect(await status()).toMatchObject({ state: 'none', isPremium: false, expiresAt: null });
  });

  it('describes the free plan, the price and the perks', async () => {
    expect(await status()).toEqual({
      state: 'none',
      isPremium: false,
      autoRenew: false,
      expiresAt: null,
      renewsAt: null,
      graceEndsAt: null,
      refundableUntil: null,
      price: { amountPaise: 99_900, currency: 'INR' },
      perks: expect.arrayContaining(['badge', 'featured', 'search_boost', 'unlimited_listings']),
      limits: { publishedListings: 25, postsPer7Days: 10 },
      heldListingCount: 0,
    });
  });
});

describe('activation and perks', () => {
  it('activates only from the verified webhook, and flips every perk hook', async () => {
    const { subscriptionId, providerSubscriptionId } = await startCheckoutFor();
    const productId = (
      await prisma.product.create({
        data: {
          businessId: owner.businessId,
          categoryId: refs.category.id,
          title: 'Bolts',
          description: 'Zinc',
          status: 'published',
          publishedAt: new Date(),
        },
      })
    ).id;
    const featured = async () =>
      (await api(ctx, 'GET', '/v1/discover'))
        .json<{ featured: { id: string }[] }>()
        .featured.map((item) => item.id);
    expect(await featured()).toEqual([]);

    await charge(ctx, providerSubscriptionId);

    const mine = (await api(ctx, 'GET', '/v1/me/business', { as: owner.session })).json<{
      isPremium: boolean;
      premiumUntil: string;
      publishedListingsLimit: number | null;
    }>();
    expect(mine).toMatchObject({ isPremium: true, publishedListingsLimit: null });
    expect(new Date(mine.premiumUntil).getTime()).toBeGreaterThan(Date.now() + 364 * DAY_MS);
    expect(await featured()).toEqual([productId]);
    // The search boost follows premium_until: a sync was queued for the business.
    const syncs = await prisma.outboxEvent.findMany({ where: { type: 'search.sync' } });
    expect(syncs.map((row) => row.payload)).toContainEqual({
      entity: 'business',
      id: owner.businessId,
    });
    expect(await status()).toMatchObject({
      state: 'active',
      isPremium: true,
      autoRenew: true,
      renewsAt: expect.any(String),
    });
    expect(subscriptionId).toBeTruthy();
  });

  it('publishes premium.activated once with the documented payload', async () => {
    const paid = await buyPremium(ctx, owner);
    await charge(ctx, paid.providerSubscriptionId); // a renewal, not another activation
    const [event, ...rest] = await events('premium.activated');
    expect(rest).toEqual([]);
    expect(event).toEqual({
      businessId: owner.businessId,
      userId: owner.userId,
      paymentId: (await prisma.payment.findFirstOrThrow({ where: { isFirst: true } })).id,
      amountPaise: 99_900,
      currency: 'INR',
      occurredAt: expect.stringMatching(/^\d{4}-\d\d-\d\dT/),
    });
    // The fan-out accepts it without notifying anyone (referrals consume it).
    await drainOutbox();
    expect(await prisma.notification.count({ where: { type: { startsWith: 'premium.' } } })).toBe(
      1,
    );
    expect(await events('premium.renewed')).toHaveLength(1);
  });
});

async function startCheckoutFor() {
  const { subscriptionId, checkout } = await startCheckout(ctx, owner);
  return { subscriptionId, providerSubscriptionId: checkout.providerSubscriptionId };
}

describe('renewal reminders', () => {
  it('sends one reminder 7 days before renewal, never for a cancelled subscription', async () => {
    await buyPremium(ctx, owner);
    expect(await lifecycle().sendRenewalReminders()).toBe(0);

    await setPeriodEnd(new Date(Date.now() + 6 * DAY_MS));
    expect(await lifecycle().sendRenewalReminders()).toBe(1);
    expect(await lifecycle().sendRenewalReminders()).toBe(0);
    expect(await events('premium.renewing')).toHaveLength(1);

    await drainOutbox();
    expect(await prisma.notification.findMany({ where: { type: 'premium.renewing' } })).toEqual([
      expect.objectContaining({ userId: owner.userId, category: 'subscription' }),
    ]);

    await prisma.subscription.updateMany({
      data: { cancelAtPeriodEnd: true, reminderSentForEnd: null },
    });
    expect(await lifecycle().sendRenewalReminders()).toBe(0);
  });
});

describe('payment failure, grace and expiry', () => {
  async function failRenewal(
    createdAt = new Date(Date.now() + 5_000),
    paymentId = nextPaymentId(),
  ) {
    const { providerSubscriptionId } = await prisma.subscription
      .findFirstOrThrow({ where: { businessId: owner.businessId } })
      .then((s) => ({ providerSubscriptionId: s.providerSubscriptionId }));
    await deliver(
      ctx,
      paymentFailedEvent(
        webhookSecret(ctx),
        { providerPaymentId: paymentId, amountPaise: 99_900, providerSubscriptionId },
        { createdAt },
      ),
    );
    await processPayments(ctx);
    return providerSubscriptionId;
  }

  it('keeps Premium for 7 days after a failed renewal, once, however often it retries', async () => {
    await buyPremium(ctx, owner);
    const periodEnd = new Date(Date.now() - 60_000);
    await setPeriodEnd(periodEnd);
    expect((await status()).isPremium).toBe(false);

    const failedAt = new Date(Math.floor(Date.now() / 1000) * 1000 + 5_000);
    await failRenewal(failedAt);
    const after = await sub();
    expect(after.status).toBe('past_due');
    const graceEnd = failedAt.getTime() + PREMIUM.graceDays * DAY_MS;
    expect(Math.abs((after.graceEndsAt?.getTime() ?? 0) - graceEnd)).toBeLessThan(1_000);
    expect((await business()).premiumUntil?.getTime()).toBe(after.graceEndsAt?.getTime());
    expect(await status()).toMatchObject({
      state: 'grace',
      isPremium: true,
      graceEndsAt: expect.any(String),
    });
    expect(await events('premium.payment_failed')).toHaveLength(1);

    // Razorpay retries: the grace does not move and nobody is notified twice.
    await failRenewal(new Date(Date.now() + 1_000));
    expect((await sub()).graceEndsAt).toEqual(after.graceEndsAt);
    expect(await events('premium.payment_failed')).toHaveLength(1);
  });

  it('returns to active when a retry succeeds inside the grace period', async () => {
    const { providerSubscriptionId } = await buyPremium(ctx, owner);
    await setPeriodEnd(new Date(Date.now() - 60_000));
    await failRenewal();
    const newEnd = new Date(Date.now() + 365 * DAY_MS);
    await charge(ctx, providerSubscriptionId, {
      createdAt: new Date(Date.now() + 10_000),
      periodStart: new Date(),
      periodEnd: newEnd,
    });
    const renewed = await sub();
    expect(renewed).toMatchObject({ status: 'active', graceEndsAt: null });
    expect(renewed.currentPeriodEnd?.getTime()).toBe(Math.floor(newEnd.getTime() / 1000) * 1000);
    expect(await status()).toMatchObject({ state: 'active', isPremium: true });
    expect(await events('premium.renewed')).toHaveLength(1);
    expect(await prisma.invoice.count()).toBe(2);
    expect(await prisma.payment.findMany({ where: { isFirst: true } })).toHaveLength(1);
  });

  it('ends Premium when the grace is over: perks off, nothing deleted, owner told', async () => {
    await buyPremium(ctx, owner);
    await setPeriodEnd(new Date(Date.now() - 60_000));
    await failRenewal();
    expect(await lifecycle().expireDue(new Date(Date.now() + 6 * DAY_MS))).toBe(0);
    expect((await sub()).status).toBe('past_due');

    // Seven days later.
    const past = new Date(Date.now() - 1_000);
    await prisma.subscription.updateMany({ data: { graceEndsAt: past } });
    await prisma.business.update({ where: { id: owner.businessId }, data: { premiumUntil: past } });
    expect(await lifecycle().expireDue()).toBe(1);
    expect(await sub()).toMatchObject({
      status: 'ended',
      endedReason: 'expired',
      graceEndsAt: null,
    });
    expect(await status()).toMatchObject({ state: 'expired', isPremium: false });
    expect(await prisma.payment.count()).toBeGreaterThan(0);
    expect(await prisma.invoice.count()).toBe(1);
    expect(await events('premium.expired')).toHaveLength(1);
    // The provider is told to stop charging a business whose perks are off.
    expect(providerOf(ctx).cancellations.at(-1)).toMatchObject({ atCycleEnd: false });
    expect(await lifecycle().expireDue()).toBe(0);

    // The search boost and Discover Featured were driven by premium_until, already in the past.
    const mine = (await api(ctx, 'GET', '/v1/me/business', { as: owner.session })).json<{
      isPremium: boolean;
      publishedListingsLimit: number | null;
    }>();
    expect(mine).toMatchObject({
      isPremium: false,
      publishedListingsLimit: PLAN_LIMITS.free.publishedListings,
    });
  });

  it('halted by Razorpay starts the grace, and is stale if a newer charge was applied', async () => {
    const { providerSubscriptionId } = await buyPremium(ctx, owner);
    const { subscriptionStatusEvent } = await import('./fake-razorpay');
    await deliver(
      ctx,
      subscriptionStatusEvent(webhookSecret(ctx), 'subscription.halted', providerSubscriptionId, {
        createdAt: new Date(Date.now() - 60_000),
      }),
    );
    await processPayments(ctx);
    expect((await sub()).status).toBe('active');

    await deliver(
      ctx,
      subscriptionStatusEvent(webhookSecret(ctx), 'subscription.halted', providerSubscriptionId, {
        createdAt: new Date(Date.now() + 10_000),
      }),
    );
    await processPayments(ctx);
    expect((await sub()).status).toBe('past_due');
  });

  it('waits a few days for a late renewal webhook before ending an auto-renewing subscription', async () => {
    await buyPremium(ctx, owner);
    await setPeriodEnd(new Date(Date.now() - DAY_MS));
    expect(await lifecycle().expireDue()).toBe(0);
    await setPeriodEnd(new Date(Date.now() - 4 * DAY_MS));
    expect(await lifecycle().expireDue()).toBe(1);
  });

  it('abandons a checkout nobody paid after a week', async () => {
    await startCheckoutFor();
    await prisma.subscription.updateMany({
      data: { createdAt: new Date(Date.now() - 8 * DAY_MS) },
    });
    expect(await lifecycle().expireDue()).toBe(1);
    expect(await sub()).toMatchObject({ status: 'ended', endedReason: 'abandoned' });
    expect((await business()).premiumUntil).toBeNull();
  });
});

describe('cancel', () => {
  const cancel = (as = owner.session) => api(ctx, 'POST', '/v1/me/business/premium/cancel', { as });

  it('turns auto-renew off and keeps Premium to the end of the paid year', async () => {
    await buyPremium(ctx, owner);
    const response = await cancel();
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      state: 'active',
      isPremium: true,
      autoRenew: false,
      renewsAt: null,
    });
    expect(providerOf(ctx).cancellations).toEqual([
      { id: (await sub()).providerSubscriptionId, atCycleEnd: true },
    ]);
    // Calling it again changes nothing and does not call the provider twice.
    expect((await cancel()).statusCode).toBe(200);
    expect(providerOf(ctx).cancellations).toHaveLength(1);

    await setPeriodEnd(new Date(Date.now() - 1_000));
    expect(await lifecycle().expireDue()).toBe(1);
    expect(await status()).toMatchObject({ state: 'expired', isPremium: false });
  });

  it('follows a cancellation made at Razorpay (the webhook)', async () => {
    const { providerSubscriptionId } = await buyPremium(ctx, owner);
    const { subscriptionStatusEvent } = await import('./fake-razorpay');
    await deliver(
      ctx,
      subscriptionStatusEvent(webhookSecret(ctx), 'subscription.cancelled', providerSubscriptionId),
    );
    await processPayments(ctx);
    expect(await status()).toMatchObject({ state: 'active', isPremium: true, autoRenew: false });
  });

  it('is for the owner only and needs a subscription', async () => {
    expect((await api(ctx, 'POST', '/v1/me/business/premium/cancel')).statusCode).toBe(401);
    expect((await cancel()).statusCode).toBe(409);
    const other = await premiumOwner(ctx, refs);
    await buyPremium(ctx, other);
    // Another owner's subscription is untouched by this owner's attempts.
    expect((await cancel()).statusCode).toBe(409);
    expect(providerOf(ctx).cancellations).toHaveLength(0);
  });

  it('reports 503 and changes nothing when the provider fails', async () => {
    await buyPremium(ctx, owner);
    providerOf(ctx).failNext = 'cancelSubscription';
    expect((await cancel()).statusCode).toBe(503);
    expect((await sub()).cancelAtPeriodEnd).toBe(false);
  });
});

describe('admin refund', () => {
  let admin: Awaited<ReturnType<typeof enrolAdmin>>;
  let browser: Awaited<ReturnType<typeof adminBrowser>>;
  beforeEach(async () => {
    admin = await enrolAdmin();
    browser = await adminBrowser(ctx, admin);
  });

  const refund = async (paymentId: string, reason = 'Customer asked within the refund window') => {
    return browser.request({
      method: 'POST',
      url: `/v1/admin/payments/${paymentId}/refund`,
      body: { reason },
    });
  };

  it('refunds a first purchase in full, audit-logged, and ends Premium on the verified webhook', async () => {
    const { providerPaymentId } = await buyPremium(ctx, owner);
    const payment = await prisma.payment.findFirstOrThrow();
    expect(await status()).toMatchObject({ refundableUntil: expect.any(String) });

    const response = await refund(payment.id);
    expect(response.statusCode, response.body).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'refund_pending',
      amount: { amountPaise: 99_900 },
    });
    expect(providerOf(ctx).refunds).toEqual([
      expect.objectContaining({ paymentId: providerPaymentId, amountPaise: 99_900 }),
    ]);
    const audit = await prisma.auditLog.findFirstOrThrow({ where: { action: 'payment.refund' } });
    expect(audit).toMatchObject({ actorUserId: admin.userId, targetId: payment.id });
    // Premium continues until the provider confirms.
    expect((await status()).isPremium).toBe(true);

    await deliver(
      ctx,
      refundProcessedEvent(webhookSecret(ctx), {
        providerRefundId: providerOf(ctx).refunds[0]?.id ?? '',
        providerPaymentId,
        amountPaise: 99_900,
      }),
    );
    await processPayments(ctx);
    expect(await prisma.payment.findFirstOrThrow()).toMatchObject({ status: 'refunded' });
    expect(await sub()).toMatchObject({ status: 'ended', endedReason: 'refunded' });
    expect(await status()).toMatchObject({ state: 'expired', isPremium: false });
    const [refunded] = await events('premium.refunded');
    expect(refunded).toMatchObject({
      businessId: owner.businessId,
      paymentId: payment.id,
      amountPaise: 99_900,
    });
  });

  it('refuses a second refund, a renewal, a payment outside the window, and a non-admin', async () => {
    const { providerSubscriptionId } = await buyPremium(ctx, owner);
    const first = await prisma.payment.findFirstOrThrow();
    await charge(ctx, providerSubscriptionId); // the renewal
    const renewal = await prisma.payment.findFirstOrThrow({ where: { isFirst: false } });
    const renewalResponse = await refund(renewal.id);
    expect(renewalResponse.statusCode).toBe(409);
    expect(problemCode(renewalResponse)).toBe('REFUND_NOT_ALLOWED');

    await prisma.payment.update({
      where: { id: first.id },
      data: { capturedAt: new Date(Date.now() - 8 * DAY_MS) },
    });
    expect((await refund(first.id)).statusCode).toBe(409);
    await prisma.payment.update({ where: { id: first.id }, data: { capturedAt: new Date() } });
    expect((await refund(first.id)).statusCode).toBe(200);
    expect((await refund(first.id)).statusCode).toBe(409);
    expect(providerOf(ctx).refunds).toHaveLength(1);

    const asUser = await api(ctx, 'POST', `/v1/admin/payments/${first.id}/refund`, {
      as: owner.session,
      body: { reason: 'Customer asked within the refund window' },
    });
    expect(asUser.statusCode).toBe(404);
    const asGuest = await api(ctx, 'POST', `/v1/admin/payments/${first.id}/refund`, {
      body: { reason: 'Customer asked within the refund window' },
    });
    expect(asGuest.statusCode).toBe(404);
  });

  it('puts the payment back when the provider refuses, so it can be retried', async () => {
    await buyPremium(ctx, owner);
    const payment = await prisma.payment.findFirstOrThrow();
    providerOf(ctx).failNext = 'refundPayment';
    expect((await refund(payment.id)).statusCode).toBe(503);
    expect((await prisma.payment.findFirstOrThrow()).status).toBe('captured');
    expect((await refund(payment.id)).statusCode).toBe(200);
  });

  it('needs a reason', async () => {
    await buyPremium(ctx, owner);
    const payment = await prisma.payment.findFirstOrThrow();
    expect((await refund(payment.id, 'short')).statusCode).toBe(400);
  });
});

describe('listings over the free limit after Premium ends', () => {
  const limit = PLAN_LIMITS.free.publishedListings;

  async function seedListings(count: number) {
    const base = Date.now() - count * 1_000;
    for (let i = 0; i < count; i += 1) {
      await prisma.product.create({
        data: {
          businessId: owner.businessId,
          categoryId: refs.category.id,
          title: `Product ${String(i).padStart(2, '0')}`,
          description: 'Seeded',
          status: 'published',
          publishedAt: new Date(base + i * 1_000),
        },
      });
    }
  }
  const published = () =>
    prisma.product.findMany({
      where: { businessId: owner.businessId, status: 'published' },
      orderBy: { title: 'asc' },
    });

  it('unpublishes the excess at expiry and lets the owner choose what to keep', async () => {
    await buyPremium(ctx, owner);
    await seedListings(limit + 5);
    expect(await published()).toHaveLength(limit + 5);

    await prisma.subscription.updateMany({ data: { cancelAtPeriodEnd: true } });
    await setPeriodEnd(new Date(Date.now() - 1_000));
    expect(await lifecycle().expireDue()).toBe(1);

    // The newest 25 stay; the 5 oldest were unpublished and are waiting for a decision.
    expect(await published()).toHaveLength(limit);
    expect(await status()).toMatchObject({ heldListingCount: 5 });
    const open = (
      await api(ctx, 'GET', '/v1/me/business/premium/listings', { as: owner.session })
    ).json<{
      isSelectionOpen: boolean;
      limit: number;
      items: { kind: string; id: string; title: string; isPublished: boolean }[];
    }>();
    expect(open).toMatchObject({ isSelectionOpen: true, limit });
    expect(open.items).toHaveLength(limit + 5);
    const held = open.items.filter((item) => !item.isPublished);
    expect(held.map((item) => item.title)).toEqual(
      ['00', '01', '02', '03', '04'].map((n) => `Product ${n}`),
    );

    // Keep the 5 held ones plus 20 of the published.
    const keep = [...held, ...open.items.filter((item) => item.isPublished).slice(0, limit - 5)];
    const chosen = await api(ctx, 'PUT', '/v1/me/business/premium/listings', {
      as: owner.session,
      body: { keep: keep.map(({ kind, id }) => ({ kind, id })) },
    });
    expect(chosen.statusCode, chosen.body).toBe(200);
    expect(chosen.json()).toMatchObject({ isSelectionOpen: false });
    expect(new Set((await published()).map((row) => row.id))).toEqual(
      new Set(keep.map((item) => item.id)),
    );
    expect(await status()).toMatchObject({ heldListingCount: 0 });
  });

  it("rejects a choice that is too big or not the owner's own", async () => {
    await buyPremium(ctx, owner);
    await seedListings(limit + 1);
    await prisma.subscription.updateMany({ data: { cancelAtPeriodEnd: true } });
    await setPeriodEnd(new Date(Date.now() - 1_000));
    await lifecycle().expireDue();

    const all = (await prisma.product.findMany({ where: { businessId: owner.businessId } })).map(
      (row) => ({
        kind: 'product',
        id: row.id,
      }),
    );
    const tooMany = await api(ctx, 'PUT', '/v1/me/business/premium/listings', {
      as: owner.session,
      body: { keep: all },
    });
    expect(tooMany.statusCode).toBe(400);

    const other = await premiumOwner(ctx, refs);
    const foreign = await prisma.product.create({
      data: {
        businessId: other.businessId,
        categoryId: refs.category.id,
        title: 'Theirs',
        description: 'x',
        status: 'published',
        publishedAt: new Date(),
      },
    });
    const stolen = await api(ctx, 'PUT', '/v1/me/business/premium/listings', {
      as: owner.session,
      body: { keep: [{ kind: 'product', id: foreign.id }] },
    });
    expect(stolen.statusCode).toBe(400);
    expect((await prisma.product.findUniqueOrThrow({ where: { id: foreign.id } })).status).toBe(
      'published',
    );
    expect(
      (await api(ctx, 'PUT', '/v1/me/business/premium/listings', { body: { keep: [] } }))
        .statusCode,
    ).toBe(401);
  });

  it('republishes what was held when Premium is bought again', async () => {
    const { providerSubscriptionId } = await buyPremium(ctx, owner);
    await seedListings(limit + 3);
    await prisma.subscription.updateMany({ data: { cancelAtPeriodEnd: true } });
    await setPeriodEnd(new Date(Date.now() - 1_000));
    await lifecycle().expireDue();
    expect(await published()).toHaveLength(limit);
    expect(providerSubscriptionId).toBeTruthy();

    await buyPremium(ctx, owner);
    expect(await published()).toHaveLength(limit + 3);
    expect(await prisma.premiumListingHold.count()).toBe(0);
  });
});
