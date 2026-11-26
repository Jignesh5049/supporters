import { PLAN_LIMITS, PREMIUM } from '@supporters/shared';
import type { FastifyBaseLogger } from 'fastify';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { recordEvent } from '../notifications/outbox';
import { recordSearchSync } from '../search/search.sync';
import type { PaymentsProvider } from './provider';

export const DAY_MS = 86_400_000;
/**
 * An active, auto-renewing subscription whose period ended without a renewal charge or failure is
 * given this long for the webhook to arrive before it is ended (UPI AutoPay debits can lag).
 */
export const RENEWAL_WAIT_MS = 3 * DAY_MS;
/** A checkout that was never paid is closed after this long. */
export const ABANDONED_AFTER_MS = 7 * DAY_MS;

type Tx = Prisma.TransactionClient;
export type SubscriptionRow = Prisma.SubscriptionGetPayload<object>;

/** Row-locks one subscription, so webhook handlers and the cron serialise on it. */
export async function lockSubscription(
  tx: Tx,
  where: { id: string } | { providerSubscriptionId: string },
): Promise<SubscriptionRow | null> {
  const rows =
    'id' in where
      ? await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM subscriptions WHERE id = ${where.id}::uuid FOR UPDATE`
      : await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM subscriptions
          WHERE provider_subscription_id = ${where.providerSubscriptionId} FOR UPDATE`;
  const id = rows[0]?.id;
  return id ? tx.subscription.findUnique({ where: { id } }) : null;
}

/** `premium_until` is the one perk gate (search boost, Discover, limits); search follows it. */
export async function setPremiumUntil(tx: Tx, businessId: string, until: Date) {
  await tx.business.update({ where: { id: businessId }, data: { premiumUntil: until } });
  await recordSearchSync(tx, 'business', businessId);
}

const latest = (...dates: (Date | null | undefined)[]) =>
  dates.reduce<Date | null>((best, date) => (date && (!best || date > best) ? date : best), null);

/** When perks end for this subscription: the paid period, or the end of grace if later. */
export const perksEnd = (sub: Pick<SubscriptionRow, 'currentPeriodEnd' | 'graceEndsAt'>) =>
  latest(sub.currentPeriodEnd, sub.graceEndsAt);

/** A renewal payment failed: perks continue until 7 days after the failure. Retries do not extend it. */
export async function enterGrace(tx: Tx, sub: SubscriptionRow, failedAt: Date) {
  if (sub.status === 'past_due' && sub.graceEndsAt) return;
  const graceEndsAt = new Date(failedAt.getTime() + PREMIUM.graceDays * DAY_MS);
  const updated = await tx.subscription.update({
    where: { id: sub.id },
    data: { status: 'past_due', graceEndsAt },
  });
  const until = perksEnd(updated);
  if (until) await setPremiumUntil(tx, sub.businessId, until);
  await recordEvent(tx, 'premium.payment_failed', { subscriptionId: sub.id });
}

/**
 * Unpublishes the listings over the free limit, keeping the newest published ones, and remembers
 * them so the owner can choose which to keep (PUT /v1/me/business/premium/listings).
 */
export async function holdExcessListings(tx: Tx, businessId: string) {
  const where = { businessId, status: 'published', deletedAt: null } as const;
  const select = { id: true, publishedAt: true } as const;
  const products = await tx.product.findMany({ where, select });
  const services = await tx.service.findMany({ where, select });
  const all = [
    ...products.map((row) => ({ ...row, kind: 'product' as const })),
    ...services.map((row) => ({ ...row, kind: 'service' as const })),
  ].sort(
    (a, b) =>
      (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0) || b.id.localeCompare(a.id),
  );
  const excess = all.slice(PLAN_LIMITS.free.publishedListings);
  for (const listing of excess) {
    if (listing.kind === 'product') {
      await tx.product.update({ where: { id: listing.id }, data: { status: 'draft' } });
    } else {
      await tx.service.update({ where: { id: listing.id }, data: { status: 'draft' } });
    }
    await tx.premiumListingHold.upsert({
      where: { kind_listingId: { kind: listing.kind, listingId: listing.id } },
      create: { businessId, kind: listing.kind, listingId: listing.id },
      update: {},
    });
    await recordSearchSync(tx, listing.kind, listing.id);
  }
  return excess.length;
}

/** Premium is back: republish what the expiry unpublished, unless the owner changed it since. */
export async function releaseHolds(tx: Tx, businessId: string) {
  const holds = await tx.premiumListingHold.findMany({ where: { businessId } });
  for (const hold of holds) {
    const data = { status: 'published' } as const;
    const where = { id: hold.listingId, businessId, status: 'draft', deletedAt: null } as const;
    const result =
      hold.kind === 'product'
        ? await tx.product.updateMany({ where, data })
        : await tx.service.updateMany({ where, data });
    if (result.count > 0)
      await recordSearchSync(tx, hold.kind === 'product' ? 'product' : 'service', hold.listingId);
  }
  await tx.premiumListingHold.deleteMany({ where: { businessId } });
}

/** Ends a subscription for good. Perks end with `premium_until`; nothing is deleted. */
export async function endSubscription(
  tx: Tx,
  sub: SubscriptionRow,
  reason: 'expired' | 'refunded' | 'abandoned',
  now: Date,
) {
  await tx.subscription.update({
    where: { id: sub.id },
    data: { status: 'ended', endedReason: reason, graceEndsAt: null },
  });
  if (reason === 'abandoned') return;
  const business = await tx.business.findUniqueOrThrow({
    where: { id: sub.businessId },
    select: { premiumUntil: true },
  });
  // A refund ends the perks now; an expiry is already at or past the end of its period.
  if (reason === 'refunded' && business.premiumUntil && business.premiumUntil > now) {
    await setPremiumUntil(tx, sub.businessId, now);
  } else {
    await recordSearchSync(tx, 'business', sub.businessId);
  }
  await holdExcessListings(tx, sub.businessId);
  if (reason === 'expired') {
    await recordEvent(tx, 'premium.expired', { subscriptionId: sub.id });
  }
}

const isDue = (sub: SubscriptionRow, now: Date): boolean => {
  if (sub.status === 'created')
    return sub.createdAt.getTime() <= now.getTime() - ABANDONED_AFTER_MS;
  if (sub.status === 'past_due') return !!sub.graceEndsAt && sub.graceEndsAt <= now;
  if (sub.status !== 'active' || !sub.currentPeriodEnd) return false;
  if (sub.cancelAtPeriodEnd) return sub.currentPeriodEnd <= now;
  return sub.currentPeriodEnd.getTime() <= now.getTime() - RENEWAL_WAIT_MS;
};

/** The scheduled half of the lifecycle: renewal reminders and expiry. Webhooks drive the rest. */
export class PremiumLifecycle {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly provider: PaymentsProvider | null,
    private readonly log: FastifyBaseLogger,
  ) {}

  /** Sends the "renews in 7 days" notice once per period, only while auto-renew is on. */
  async sendRenewalReminders(now = new Date()): Promise<number> {
    const due = await this.prisma.subscription.findMany({
      where: {
        status: 'active',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: { gt: now, lte: new Date(now.getTime() + PREMIUM.reminderDays * DAY_MS) },
      },
      select: { id: true },
    });
    let sent = 0;
    for (const { id } of due) {
      const done = await this.prisma.$transaction(async (tx) => {
        const sub = await lockSubscription(tx, { id });
        if (
          !sub ||
          sub.status !== 'active' ||
          sub.cancelAtPeriodEnd ||
          !sub.currentPeriodEnd ||
          sub.reminderSentForEnd?.getTime() === sub.currentPeriodEnd.getTime()
        ) {
          return false;
        }
        await tx.subscription.update({
          where: { id },
          data: { reminderSentForEnd: sub.currentPeriodEnd },
        });
        await recordEvent(tx, 'premium.renewing', { subscriptionId: id });
        return true;
      });
      if (done) sent += 1;
    }
    return sent;
  }

  /** Ends subscriptions whose paid period or grace is over, and unpaid checkouts nobody finished. */
  async expireDue(now = new Date()): Promise<number> {
    const candidates = await this.prisma.subscription.findMany({
      where: {
        OR: [
          { status: 'created', createdAt: { lte: new Date(now.getTime() - ABANDONED_AFTER_MS) } },
          { status: 'past_due', graceEndsAt: { lte: now } },
          { status: 'active', currentPeriodEnd: { lte: now } },
        ],
      },
      select: { id: true },
    });
    let ended = 0;
    for (const { id } of candidates) {
      const result = await this.prisma.$transaction(async (tx) => {
        const sub = await lockSubscription(tx, { id });
        if (!sub || !isDue(sub, now)) return null;
        const reason = sub.status === 'created' ? 'abandoned' : 'expired';
        await endSubscription(tx, sub, reason, now);
        return sub;
      });
      if (!result) continue;
      ended += 1;
      // Stop the provider charging a business whose perks are off (best effort; it may already be over).
      if (this.provider && !result.cancelAtPeriodEnd) {
        await this.provider
          .cancelSubscription(result.providerSubscriptionId, false)
          .catch((err: unknown) => {
            this.log.warn(
              { subscriptionId: result.id, err },
              'provider cancel after expiry failed',
            );
          });
      }
    }
    return ended;
  }
}
