import { randomUUID } from 'node:crypto';
import { PREMIUM, gstinCheckChar } from '@supporters/shared';
import type { LightMyRequestResponse } from 'fastify';
import {
  type ChargedInput,
  FakeRazorpay,
  type SignedWebhook,
  chargedEvent,
} from '../modules/payments/fake-razorpay';
import { signUpOwner, type ReferenceData } from './catalog';
import { type MobileSession, type TestContext, nextIp, prisma } from './helpers';

export const DAY_MS = 86_400_000;

export const providerOf = (ctx: TestContext): FakeRazorpay => {
  const provider = ctx.app.services.payments.provider;
  if (!(provider instanceof FakeRazorpay)) throw new Error('tests use the fake provider');
  return provider;
};

export const webhookSecret = (ctx: TestContext) => ctx.env.RAZORPAY_WEBHOOK_SECRET ?? '';

/** A GSTIN with a valid check character for the given state code. */
export function gstinFor(stateCode: string, pan = 'ABCDE1234F') {
  const first14 = `${stateCode}${pan}1Z`;
  return `${first14}${gstinCheckChar(first14)}`;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Calls the API; `web` leaves out `X-Client: mobile` (a mobile session sends it by default). */
export function api(
  ctx: TestContext,
  method: Method,
  url: string,
  options: {
    as?: MobileSession;
    body?: object;
    headers?: Record<string, string>;
    client?: 'web' | 'mobile';
  } = {},
): Promise<LightMyRequestResponse> {
  return ctx.app.inject({
    method,
    url,
    headers: {
      ...(options.as ? { authorization: `Bearer ${options.as.accessToken}` } : {}),
      ...(options.client === 'mobile' ? { 'x-client': 'mobile' } : {}),
      ...options.headers,
    },
    remoteAddress: nextIp(),
    ...(options.body !== undefined ? { payload: options.body } : {}),
  });
}

export interface PremiumOwner {
  session: MobileSession;
  businessId: string;
  userId: string;
}

export async function premiumOwner(ctx: TestContext, refs: ReferenceData, overrides = {}) {
  const { session, business } = await signUpOwner(ctx, refs, overrides);
  return { session, businessId: business.id, userId: session.user.id } satisfies PremiumOwner;
}

/** Starts a checkout (web) and returns the provider subscription id. */
export async function startCheckout(
  ctx: TestContext,
  owner: PremiumOwner,
  body: object = {},
  key: string = randomUUID(),
) {
  const response = await api(ctx, 'POST', '/v1/me/business/premium/checkout', {
    as: owner.session,
    body,
    headers: { 'idempotency-key': key },
  });
  if (response.statusCode !== 201) throw new Error(`checkout failed: ${response.body}`);
  return response.json<{ subscriptionId: string; checkout: { providerSubscriptionId: string } }>();
}

/** POSTs a signed delivery to the webhook route, as Razorpay would. */
export function deliver(
  ctx: TestContext,
  delivery: SignedWebhook | { body: string; headers: Record<string, string> },
) {
  return ctx.app.inject({
    method: 'POST',
    url: '/v1/webhooks/razorpay',
    headers: delivery.headers,
    payload: delivery.body,
    remoteAddress: nextIp(),
  });
}

/** Runs the `payments` queue's work by hand: every stored delivery not yet applied, oldest first. */
export async function processPayments(
  ctx: TestContext,
  statuses: ('received' | 'failed')[] = ['received', 'failed'],
) {
  const rows = await prisma.webhookEvent.findMany({
    where: { status: { in: statuses } },
    orderBy: { id: 'asc' },
    select: { id: true },
  });
  const results: string[] = [];
  for (const row of rows) results.push(await ctx.app.services.payments.processor.process(row.id));
  return results;
}

let paymentCounter = 0;
export const nextPaymentId = () => `pay_test${String(++paymentCounter).padStart(10, '0')}`;

/** Delivers and applies a first (or renewal) charge for the subscription. */
export async function charge(
  ctx: TestContext,
  providerSubscriptionId: string,
  options: Partial<ChargedInput> & { createdAt?: Date; eventId?: string } = {},
) {
  const periodStart = options.periodStart ?? new Date();
  const providerPaymentId = options.providerPaymentId ?? nextPaymentId();
  const delivery = chargedEvent(
    webhookSecret(ctx),
    {
      providerSubscriptionId,
      providerPaymentId,
      amountPaise: options.amountPaise ?? PREMIUM.pricePaise,
      periodStart,
      periodEnd: options.periodEnd ?? new Date(periodStart.getTime() + PREMIUM.periodDays * DAY_MS),
    },
    {
      ...(options.createdAt ? { createdAt: options.createdAt } : {}),
      ...(options.eventId ? { eventId: options.eventId } : {}),
    },
  );
  const response = await deliver(ctx, delivery);
  await processPayments(ctx);
  return { response, delivery, providerPaymentId };
}

/** Checkout plus a captured first payment: the business is Premium. */
export async function buyPremium(ctx: TestContext, owner: PremiumOwner, body: object = {}) {
  const { subscriptionId, checkout } = await startCheckout(ctx, owner, body);
  const paid = await charge(ctx, checkout.providerSubscriptionId);
  return { subscriptionId, providerSubscriptionId: checkout.providerSubscriptionId, ...paid };
}
