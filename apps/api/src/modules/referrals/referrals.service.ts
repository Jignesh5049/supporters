import { createHmac } from 'node:crypto';
import {
  LedgerEntryType,
  type PaginationQuery,
  type PremiumActivatedEvent,
  type PremiumRefundedEvent,
  REFERRAL,
  type Referral,
  ReferralReason,
  ReferralStatus,
  type ReferralsResponse,
} from '@supporters/shared';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { toMoney } from '../../lib/money';
import { pageArgs, splitPage } from '../../lib/pagination';
import { recordEvent } from '../notifications/outbox';
import { appendEntry, auditMoney, balanceOf, lockWallet } from '../wallet/wallet.ledger';
import { ensureReferralCode } from './referrals.codes';
import type { SignupSignals } from './referrals.signals';

const DAY_MS = 24 * 3_600_000;

/** Never contact details: the first name and the initial of the last. */
const shortName = (name: string) => {
  const [first = '', ...rest] = name.trim().split(/\s+/);
  const initial = rest.at(-1)?.[0];
  return initial ? `${first} ${initial.toUpperCase()}.` : first;
};

export class ReferralsService {
  constructor(
    private readonly prisma: PrismaClient,
    /** Keys the phone and IP hashes: a hash of a phone number is still personal data. */
    private readonly hashKey: Buffer,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private hash(label: string, value: string): string {
    return createHmac('sha256', this.hashKey).update(`referral:${label}:${value}`).digest('hex');
  }

  /** The owner of a code, or null. Case-insensitive: codes are stored upper-case. */
  async resolveCode(code: string): Promise<{ userId: string } | null> {
    const row = await this.prisma.referralCode.findUnique({
      where: { code: code.toUpperCase() },
      select: { userId: true, user: { select: { status: true } } },
    });
    return row && row.user.status === 'active' ? { userId: row.userId } : null;
  }

  /**
   * Called from registration, in the new user's transaction. Decides at once what can be decided
   * from the signup itself: self-referral, an earlier account on the same phone or device, and a
   * failed device attestation are Ineligible. Everything else is Pending until Premium.
   */
  async recordSignup(
    tx: Prisma.TransactionClient,
    input: {
      referrerUserId: string;
      referredUserId: string;
      phone: string;
      ip: string;
      signals: SignupSignals;
    },
  ): Promise<void> {
    const phoneHash = this.hash('phone', input.phone);
    const deviceKeyHash = input.signals.deviceKey
      ? this.hash('device', input.signals.deviceKey)
      : null;

    let reason: ReferralReason | null = null;
    if (input.referrerUserId === input.referredUserId) {
      reason = ReferralReason.SelfReferral;
    } else if (input.signals.attestationPassed === false) {
      reason = ReferralReason.AttestationFailed;
    } else if (await tx.referral.findFirst({ where: { phoneHash }, select: { id: true } })) {
      // The number signed up before (a deleted account) and was already counted once.
      reason = ReferralReason.PhoneReused;
    } else if (deviceKeyHash) {
      const referrerSignup = await tx.referral.findUnique({
        where: { referredUserId: input.referrerUserId },
        select: { deviceKeyHash: true },
      });
      if (referrerSignup?.deviceKeyHash === deviceKeyHash) {
        // The referrer's own phone signed this account up.
        reason = ReferralReason.SelfReferral;
      } else if (await tx.referral.findFirst({ where: { deviceKeyHash }, select: { id: true } })) {
        reason = ReferralReason.DeviceReused;
      }
    }

    const referral = await tx.referral.create({
      data: {
        referrerUserId: input.referrerUserId,
        referredUserId: input.referredUserId,
        status: reason ? ReferralStatus.Ineligible : ReferralStatus.Pending,
        reason: reason ?? ReferralReason.AwaitingPremium,
        phoneHash,
        signupIpHash: this.hash('ip', input.ip),
        deviceKeyHash,
        attestationPassed: input.signals.attestationPassed,
        resolvedAt: reason ? this.now() : null,
      },
      select: { id: true },
    });
    if (reason) await recordEvent(tx, 'referral.ineligible', { referralId: referral.id });
  }

  /**
   * `premium.activated`: the referred user's business paid. Starts the refund window. Runs inside
   * the notification fan-out's transaction, which processes each event once; a second delivery
   * finds `premium_activated_at` set and does nothing.
   */
  async handlePremiumActivated(
    tx: Prisma.TransactionClient,
    event: PremiumActivatedEvent,
  ): Promise<void> {
    const [locked] = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM referrals
      WHERE referred_user_id = ${event.userId}::uuid AND status = 'pending'
        AND premium_activated_at IS NULL
      FOR UPDATE`;
    if (!locked) return;
    const activatedAt = new Date(event.occurredAt);
    await tx.referral.update({
      where: { id: locked.id },
      data: {
        businessId: event.businessId,
        paymentId: event.paymentId,
        premiumActivatedAt: activatedAt,
        eligibleAt: new Date(activatedAt.getTime() + REFERRAL.pendingDays * DAY_MS),
        reason: ReferralReason.RefundWindow,
      },
    });
    await recordEvent(tx, 'referral.pending', { referralId: locked.id });
  }

  /** `premium.refunded` inside the window makes the referral Ineligible. After credit: no clawback. */
  async handlePremiumRefunded(
    tx: Prisma.TransactionClient,
    event: PremiumRefundedEvent,
  ): Promise<void> {
    const [locked] = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM referrals
      WHERE referred_user_id = ${event.userId}::uuid AND status = 'pending'
        AND payment_id = ${event.paymentId}::uuid
      FOR UPDATE`;
    if (!locked) return;
    await this.resolve(tx, locked.id, ReferralStatus.Ineligible, ReferralReason.PaymentRefunded);
  }

  private async resolve(
    tx: Prisma.TransactionClient,
    id: string,
    status: ReferralStatus,
    reason: ReferralReason,
    rewardPaise: bigint | null = null,
  ): Promise<void> {
    await tx.referral.update({
      where: { id },
      data: { status, reason, rewardPaise, resolvedAt: this.now() },
    });
    if (status === ReferralStatus.Ineligible) {
      await recordEvent(tx, 'referral.ineligible', { referralId: id });
    }
  }

  /**
   * The finalizer (a cron job): every pending referral whose refund window has ended becomes
   * Successful and credits the referrer, or Ineligible. Each referral is its own transaction under
   * the referrer's wallet lock, so reward ranks (first ₹300, second ₹200) and the lifetime cap
   * hold even when jobs overlap, and a repeated run credits nothing twice (`referral:<id>` key).
   */
  async finalizeDue(): Promise<{ credited: number; ineligible: number }> {
    const now = this.now();
    const due = await this.prisma.referral.findMany({
      where: { status: 'pending', eligibleAt: { lte: now } },
      select: { id: true, referrerUserId: true },
      orderBy: { eligibleAt: 'asc' },
      take: 200,
    });
    const result = { credited: 0, ineligible: 0 };
    for (const { id, referrerUserId } of due) {
      const outcome = await this.prisma.$transaction(async (tx) => {
        await lockWallet(tx, referrerUserId);
        const [locked] = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM referrals
          WHERE id = ${id}::uuid AND status = 'pending' AND eligible_at <= ${now}
          FOR UPDATE`;
        if (!locked) return 'skipped' as const;
        const referral = await tx.referral.findUniqueOrThrow({
          where: { id },
          select: {
            attestationPassed: true,
            referrer: { select: { status: true } },
            referred: { select: { status: true } },
          },
        });
        if (referral.referrer.status !== 'active' || referral.referred.status !== 'active') {
          await this.resolve(tx, id, ReferralStatus.Ineligible, ReferralReason.AccountSuspended);
          return 'ineligible' as const;
        }
        if (referral.attestationPassed === false) {
          await this.resolve(tx, id, ReferralStatus.Ineligible, ReferralReason.AttestationFailed);
          return 'ineligible' as const;
        }

        // Rank is the number of referrals this referrer already had credited; the cap is
        // measured on what the ledger actually holds, so a bonus never eats into it.
        const earned = await tx.walletLedger.aggregate({
          where: { userId: referrerUserId, type: LedgerEntryType.ReferralReward },
          _sum: { amountPaise: true },
        });
        const rank = await tx.referral.count({
          where: { referrerUserId, status: 'successful', id: { not: id } },
        });
        const room = BigInt(REFERRAL.lifetimeCapPaise) - (earned._sum.amountPaise ?? 0n);
        const scheduled = BigInt(REFERRAL.rewardsPaise[rank] ?? 0);
        const reward = room <= 0n ? 0n : scheduled < room ? scheduled : room;

        if (reward === 0n) {
          await this.resolve(tx, id, ReferralStatus.Successful, ReferralReason.CapReached, 0n);
          return 'credited' as const;
        }
        await appendEntry(tx, {
          userId: referrerUserId,
          type: LedgerEntryType.ReferralReward,
          amountPaise: reward,
          entryKey: `referral:${id}`,
          description: 'Referral reward',
          referralId: id,
        });
        await auditMoney(
          tx,
          { userId: referrerUserId, kind: 'system' },
          {
            action: 'wallet.referral_credit',
            targetType: 'referral',
            targetId: id,
            metadata: {
              amountPaise: Number(reward),
              balancePaise: Number(await balanceOf(tx, referrerUserId)),
            },
          },
        );
        await this.resolve(tx, id, ReferralStatus.Successful, ReferralReason.Credited, reward);
        await recordEvent(tx, 'referral.credited', { referralId: id });
        return 'credited' as const;
      });
      if (outcome === 'credited') result.credited += 1;
      if (outcome === 'ineligible') result.ineligible += 1;
    }
    return result;
  }

  /** Referred users who never bought Premium stop being pending after the waiting period. */
  async failStale(): Promise<number> {
    const cutoff = new Date(this.now().getTime() - REFERRAL.awaitingPremiumDays * DAY_MS);
    const { count } = await this.prisma.referral.updateMany({
      where: { status: 'pending', premiumActivatedAt: null, createdAt: { lt: cutoff } },
      data: { status: 'failed', reason: ReferralReason.NeverPurchased, resolvedAt: this.now() },
    });
    return count;
  }

  /** `GET /me/referrals`: the code, the stats and the history with each status's reason. */
  async overview(userId: string, query: PaginationQuery): Promise<ReferralsResponse> {
    const code = await ensureReferralCode(this.prisma, userId);
    const page = pageArgs(query.cursor, query.limit);
    const [rows, counts, earned] = await Promise.all([
      this.prisma.referral.findMany({
        ...page,
        where: { ...page.where, referrerUserId: userId },
        include: { referred: { select: { name: true } } },
      }),
      this.prisma.referral.groupBy({
        by: ['status'],
        where: { referrerUserId: userId },
        _count: true,
      }),
      this.prisma.walletLedger.aggregate({
        where: { userId, type: LedgerEntryType.ReferralReward },
        _sum: { amountPaise: true },
      }),
    ]);
    const count = (status: ReferralStatus) => counts.find((c) => c.status === status)?._count ?? 0;
    const totalEarned = earned._sum.amountPaise ?? 0n;
    const cap = BigInt(REFERRAL.lifetimeCapPaise);
    const split = splitPage(rows, query.limit);
    return {
      code,
      stats: {
        pending: count('pending'),
        successful: count('successful'),
        ineligible: count('ineligible'),
        failed: count('failed'),
        totalEarned: toMoney(totalEarned),
        remainingToCap: toMoney(totalEarned >= cap ? 0n : cap - totalEarned),
      },
      data: split.rows.map((row): Referral => ({
        id: row.id,
        referredName: shortName(row.referred.name),
        status: row.status,
        reason: row.reason as ReferralReason,
        reward: row.rewardPaise === null ? null : toMoney(row.rewardPaise),
        eligibleAt: row.eligibleAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor: split.nextCursor,
    };
  }
}
