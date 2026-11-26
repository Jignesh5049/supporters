import { randomUUID } from 'node:crypto';
import {
  type AdminPayment,
  type KeepListingsInput,
  PLAN_LIMITS,
  PREMIUM,
  PREMIUM_PERKS,
  type Page,
  type PremiumCheckoutInput,
  type PremiumCheckoutResult,
  type PremiumListings,
  type PremiumState,
  type PremiumStatus,
} from '@supporters/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { Redis } from 'ioredis';
import type { PrismaClient } from '../../generated/prisma/client';
import { sha256 } from '../../lib/crypto';
import { AppError, ErrorCode, invalidField, isUniqueViolation, notFound } from '../../lib/errors';
import { pageArgs, splitPage } from '../../lib/pagination';
import { writeAudit } from '../admin/audit.service';
import { isPremium, businessRequired } from '../businesses/businesses.service';
import { recordSearchSync } from '../search/search.sync';
import { DAY_MS, endSubscription, lockSubscription } from './lifecycle';
import { paymentsNotConfigured, providerDown } from './payments.errors';
import type { PaymentsProvider } from './provider';

type Actor = Parameters<typeof writeAudit>[1];

/** A checkout that was started but not paid is offered again for this long. */
const CHECKOUT_REUSE_MS = DAY_MS;
const LIVE = ['created', 'active', 'past_due'] as const;

const hashRequest = (input: PremiumCheckoutInput) =>
  sha256(JSON.stringify({ buyerGstin: input.buyerGstin ?? null }));

export class PremiumService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly valkey: Redis,
    private readonly provider: PaymentsProvider | null,
    private readonly log: FastifyBaseLogger,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private requireProvider(): PaymentsProvider {
    if (!this.provider) throw paymentsNotConfigured();
    return this.provider;
  }

  private async requireBusiness(userId: string) {
    const business = await this.prisma.business.findUnique({
      where: { ownerUserId: userId },
      select: { id: true, premiumUntil: true, gstin: true },
    });
    if (!business) throw businessRequired();
    return business;
  }

  /** From the database only: status never calls the provider, and works without it. */
  async status(userId: string): Promise<PremiumStatus> {
    const business = await this.requireBusiness(userId);
    const now = this.now();
    const live = await this.prisma.subscription.findFirst({
      where: { businessId: business.id, status: { in: [...LIVE] } },
    });
    const last =
      live ??
      (await this.prisma.subscription.findFirst({
        where: { businessId: business.id },
        orderBy: { id: 'desc' },
      }));
    const firstPayment = last
      ? await this.prisma.payment.findFirst({
          where: { subscriptionId: last.id, isFirst: true, status: 'captured' },
        })
      : null;
    const heldListingCount = await this.prisma.premiumListingHold.count({
      where: { businessId: business.id },
    });

    let state: PremiumState = 'none';
    if (live?.status === 'created') state = 'pending';
    else if (live?.status === 'active') state = 'active';
    else if (live?.status === 'past_due') state = 'grace';
    else if (last) state = 'expired';
    // A subscription that is active in the database but past its end (the renewal webhook is late).
    const isOn = isPremium(business, now);
    if (state === 'active' && !isOn) state = 'expired';

    const autoRenew = live?.status === 'active' && !live.cancelAtPeriodEnd;
    const refundableUntil = firstPayment?.capturedAt
      ? new Date(firstPayment.capturedAt.getTime() + PREMIUM.refundWindowDays * DAY_MS)
      : null;
    return {
      state,
      isPremium: isOn,
      autoRenew,
      expiresAt: business.premiumUntil?.toISOString() ?? null,
      renewsAt: autoRenew && live.currentPeriodEnd ? live.currentPeriodEnd.toISOString() : null,
      graceEndsAt: live?.status === 'past_due' ? (live.graceEndsAt?.toISOString() ?? null) : null,
      refundableUntil:
        refundableUntil && refundableUntil > now ? refundableUntil.toISOString() : null,
      price: { amountPaise: PREMIUM.pricePaise, currency: 'INR' },
      perks: [...PREMIUM_PERKS],
      limits: {
        publishedListings: PLAN_LIMITS.free.publishedListings,
        postsPer7Days: PLAN_LIMITS.free.postsPer7Days,
      },
      heldListingCount,
    };
  }

  /**
   * Creates (or returns) the Razorpay Subscription Checkout needs. Safe to retry: the same
   * Idempotency-Key and body returns the same subscription, and the same key with another body is
   * refused. Nothing here activates Premium: only a verified webhook does.
   */
  async checkout(
    userId: string,
    input: PremiumCheckoutInput,
    idempotencyKey: string,
  ): Promise<{ result: PremiumCheckoutResult; isReplay: boolean }> {
    const provider = this.requireProvider();
    const business = await this.requireBusiness(userId);
    const requestHash = hashRequest(input);

    const replay = await this.prisma.subscription.findUnique({
      where: { createdByUserId_idempotencyKey: { createdByUserId: userId, idempotencyKey } },
    });
    if (replay) {
      if (replay.requestHash !== requestHash) {
        throw new AppError(422, ErrorCode.IdempotencyKeyReused, 'Idempotency key already used', {
          detail: 'This Idempotency-Key was used for a different request.',
        });
      }
      return { result: this.toCheckout(provider, replay), isReplay: true };
    }

    // One checkout at a time per user, so two taps never create two Razorpay subscriptions.
    const lockKey = `premium:checkout:${userId}`;
    if ((await this.valkey.set(lockKey, '1', 'EX', 30, 'NX')) !== 'OK') {
      throw new AppError(409, ErrorCode.RequestInProgress, 'Request already in progress', {
        retryAfter: 2,
      });
    }
    try {
      return await this.createCheckout(
        provider,
        userId,
        business,
        input,
        idempotencyKey,
        requestHash,
      );
    } finally {
      await this.valkey.del(lockKey);
    }
  }

  private async createCheckout(
    provider: PaymentsProvider,
    userId: string,
    business: { id: string },
    input: PremiumCheckoutInput,
    idempotencyKey: string,
    requestHash: string,
  ) {
    const now = this.now();
    const live = await this.prisma.subscription.findFirst({
      where: { businessId: business.id, status: { in: [...LIVE] } },
    });
    if (live && live.status !== 'created') {
      throw new AppError(409, ErrorCode.PremiumExists, 'Premium is already set up', {
        detail:
          live.status === 'past_due'
            ? 'A renewal payment failed. It is retried automatically; Premium stays on for 7 days.'
            : 'This business already has Premium.',
      });
    }
    if (live) {
      if (now.getTime() - live.createdAt.getTime() < CHECKOUT_REUSE_MS) {
        // Resume the unpaid checkout instead of opening a second one.
        const resumed = await this.prisma.subscription.update({
          where: { id: live.id },
          data: { buyerGstin: input.buyerGstin ?? null },
        });
        return { result: this.toCheckout(provider, resumed), isReplay: false };
      }
      await this.abandon(provider, live.id);
    }

    const id = randomUUID();
    let providerSubscriptionId: string;
    try {
      ({ id: providerSubscriptionId } = await provider.createSubscription({
        reference: id,
        businessId: business.id,
      }));
    } catch (error) {
      this.log.error({ err: error }, 'creating the provider subscription failed');
      throw providerDown();
    }
    try {
      const created = await this.prisma.subscription.create({
        data: {
          id,
          businessId: business.id,
          createdByUserId: userId,
          providerSubscriptionId,
          amountPaise: BigInt(PREMIUM.pricePaise),
          currency: 'INR',
          buyerGstin: input.buyerGstin ?? null,
          idempotencyKey,
          requestHash,
        },
      });
      return { result: this.toCheckout(provider, created), isReplay: false };
    } catch (error) {
      await provider.cancelSubscription(providerSubscriptionId, false).catch(() => undefined);
      if (isUniqueViolation(error)) {
        throw new AppError(409, ErrorCode.PremiumExists, 'Premium is already set up');
      }
      throw error;
    }
  }

  private async abandon(provider: PaymentsProvider, subscriptionId: string) {
    const ended = await this.prisma.$transaction(async (tx) => {
      const sub = await lockSubscription(tx, { id: subscriptionId });
      if (!sub || sub.status !== 'created') return null;
      await endSubscription(tx, sub, 'abandoned', this.now());
      return sub;
    });
    if (ended) {
      await provider.cancelSubscription(ended.providerSubscriptionId, false).catch(() => undefined);
    }
  }

  private toCheckout(
    provider: PaymentsProvider,
    sub: { id: string; providerSubscriptionId: string; amountPaise: bigint },
  ): PremiumCheckoutResult {
    return {
      subscriptionId: sub.id,
      provider: provider.name,
      // The public key id only. The key secret is never read outside the provider adapter.
      checkout: { keyId: provider.keyId, providerSubscriptionId: sub.providerSubscriptionId },
      price: { amountPaise: Number(sub.amountPaise), currency: 'INR' },
    };
  }

  /** Auto-renew off: Premium stays on until the end of the paid period. Calling it again is harmless. */
  async cancel(userId: string): Promise<PremiumStatus> {
    const provider = this.requireProvider();
    const business = await this.requireBusiness(userId);
    const sub = await this.prisma.subscription.findFirst({
      where: { businessId: business.id, status: { in: [...LIVE] } },
    });
    if (!sub) {
      throw new AppError(409, ErrorCode.Conflict, 'Nothing to cancel', {
        detail: 'This business has no Premium subscription.',
      });
    }
    if (sub.status === 'created') {
      await this.abandon(provider, sub.id);
      return this.status(userId);
    }
    if (!sub.cancelAtPeriodEnd) {
      try {
        await provider.cancelSubscription(sub.providerSubscriptionId, true);
      } catch (error) {
        this.log.error({ err: error, subscriptionId: sub.id }, 'provider cancel failed');
        throw providerDown();
      }
      await this.prisma.subscription.updateMany({
        where: { id: sub.id, cancelAtPeriodEnd: false },
        data: { cancelAtPeriodEnd: true, cancelledAt: this.now() },
      });
    }
    return this.status(userId);
  }

  // Choosing which listings to keep after Premium ends

  async listings(userId: string): Promise<PremiumListings> {
    const business = await this.requireBusiness(userId);
    return this.readListings(this.prisma, business.id, isPremium(business, this.now()));
  }

  private async readListings(
    db: Pick<PrismaClient, 'product' | 'service' | 'premiumListingHold'>,
    businessId: string,
    isOn: boolean,
  ): Promise<PremiumListings> {
    const holds = await db.premiumListingHold.findMany({ where: { businessId } });
    const heldIds = (kind: string) =>
      holds.filter((hold) => hold.kind === kind).map((hold) => hold.listingId);
    const select = { id: true, title: true, status: true } as const;
    const base = { businessId, deletedAt: null } as const;
    const products = await db.product.findMany({
      where: { ...base, OR: [{ status: 'published' }, { id: { in: heldIds('product') } }] },
      select,
      orderBy: { id: 'asc' },
    });
    const services = await db.service.findMany({
      where: { ...base, OR: [{ status: 'published' }, { id: { in: heldIds('service') } }] },
      select,
      orderBy: { id: 'asc' },
    });
    return {
      limit: PLAN_LIMITS.free.publishedListings,
      items: [
        ...products.map((row) => ({
          kind: 'product' as const,
          id: row.id,
          title: row.title,
          isPublished: row.status === 'published',
        })),
        ...services.map((row) => ({
          kind: 'service' as const,
          id: row.id,
          title: row.title,
          isPublished: row.status === 'published',
        })),
      ],
      isSelectionOpen: !isOn && holds.length > 0,
    };
  }

  /**
   * After Premium ends: the owner picks which listings stay published (at most the free limit).
   * Everything else published is unpublished; listings the expiry unpublished and the owner picks
   * are published again. Closes the selection.
   */
  async keepListings(userId: string, input: KeepListingsInput): Promise<PremiumListings> {
    const business = await this.requireBusiness(userId);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${business.id}::uuid FOR UPDATE`;
      const fresh = await tx.business.findUniqueOrThrow({
        where: { id: business.id },
        select: { premiumUntil: true },
      });
      if (isPremium(fresh, this.now())) {
        throw new AppError(409, ErrorCode.PremiumExists, 'Premium is active', {
          detail: 'Every listing can stay published while Premium is active.',
        });
      }
      const current = await this.readListings(tx, business.id, false);
      const allowed = new Set(current.items.map((item) => `${item.kind}:${item.id}`));
      input.keep.forEach((item, index) => {
        if (!allowed.has(`${item.kind}:${item.id}`)) {
          throw invalidField(`body.keep.${index}`, 'Not one of your published or held listings');
        }
      });
      const keep = new Set(input.keep.map((item) => `${item.kind}:${item.id}`));
      for (const item of current.items) {
        const shouldBePublished = keep.has(`${item.kind}:${item.id}`);
        if (shouldBePublished === item.isPublished) continue;
        const data = { status: shouldBePublished ? ('published' as const) : ('draft' as const) };
        if (item.kind === 'product') await tx.product.update({ where: { id: item.id }, data });
        else await tx.service.update({ where: { id: item.id }, data });
        await recordSearchSync(tx, item.kind, item.id);
      }
      await tx.premiumListingHold.deleteMany({ where: { businessId: business.id } });
    });
    return this.listings(userId);
  }

  // Admin

  async adminPayments(query: {
    cursor?: string | undefined;
    limit: number;
    businessId?: string | undefined;
  }): Promise<Page<AdminPayment>> {
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.payment.findMany({
      ...page,
      where: { ...page.where, ...(query.businessId ? { businessId: query.businessId } : {}) },
      include: { business: { select: { name: true } }, invoice: { select: { number: true } } },
    });
    const split = splitPage(rows, query.limit);
    const now = this.now();
    return {
      data: split.rows.map((row) => {
        const until =
          row.isFirst && row.status === 'captured' && row.capturedAt
            ? new Date(row.capturedAt.getTime() + PREMIUM.refundWindowDays * DAY_MS)
            : null;
        return {
          id: row.id,
          businessId: row.businessId,
          businessName: row.business.name,
          amount: { amountPaise: Number(row.amountPaise), currency: 'INR' as const },
          status: row.status,
          isFirst: row.isFirst,
          capturedAt: row.capturedAt?.toISOString() ?? null,
          refundableUntil: until && until > now ? until.toISOString() : null,
          invoiceNumber: row.invoice?.number ?? null,
        };
      }),
      nextCursor: split.nextCursor,
    };
  }

  /**
   * Full refund of a first purchase within 7 days (an admin decision, audit-logged in the same
   * transaction as the state change). The provider is called with a stable reference, so a retry
   * cannot refund twice. Premium ends when the verified `refund.processed` webhook arrives.
   */
  async refund(admin: Actor, paymentId: string, reason: string): Promise<AdminPayment> {
    const provider = this.requireProvider();
    const now = this.now();
    const payment = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM payments WHERE id = ${paymentId}::uuid FOR UPDATE`;
      const row = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!row) throw notFound();
      const refusal = refundRefusal(row, now);
      if (refusal) {
        throw new AppError(409, ErrorCode.RefundNotAllowed, 'Refund not allowed', {
          detail: refusal,
        });
      }
      await tx.payment.update({
        where: { id: row.id },
        data: { status: 'refund_pending', refundRequestedAt: now, refundedByAdminId: admin.userId },
      });
      await writeAudit(tx, admin, {
        action: 'payment.refund',
        targetType: 'payment',
        targetId: row.id,
        metadata: { businessId: row.businessId, amountPaise: Number(row.amountPaise), reason },
      });
      return row;
    });

    try {
      const { id: providerRefundId } = await provider.refundPayment(
        payment.providerPaymentId,
        Number(payment.amountPaise),
        { reference: `refund-${payment.id}` },
      );
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { providerRefundId },
      });
      const sub = await this.prisma.subscription.findUnique({
        where: { id: payment.subscriptionId },
      });
      // Stop the provider charging the next year while the refund settles.
      if (sub && sub.status !== 'ended') {
        await provider
          .cancelSubscription(sub.providerSubscriptionId, false)
          .catch((err: unknown) => {
            this.log.warn({ subscriptionId: sub.id, err }, 'provider cancel after refund failed');
          });
      }
    } catch (error) {
      this.log.error({ err: error, paymentId: payment.id }, 'provider refund failed');
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'captured', refundRequestedAt: null, refundedByAdminId: null },
      });
      throw providerDown();
    }
    const page = await this.adminPayments({ limit: 50, businessId: payment.businessId });
    const found = page.data.find((item) => item.id === payment.id);
    if (!found) throw notFound();
    return found;
  }
}

/** Why a payment cannot be refunded, or null when it can. */
export function refundRefusal(
  payment: { status: string; isFirst: boolean; capturedAt: Date | null },
  now: Date,
): string | null {
  if (payment.status !== 'captured') return 'Only a captured payment can be refunded.';
  if (!payment.isFirst) return 'Renewals are not refunded.';
  if (!payment.capturedAt) return 'The payment was not captured.';
  if (now.getTime() > payment.capturedAt.getTime() + PREMIUM.refundWindowDays * DAY_MS) {
    return `The ${PREMIUM.refundWindowDays}-day refund window has passed.`;
  }
  return null;
}
