import type { PrismaClient } from '../../generated/prisma/client';
import type { PayoutsRuntime } from './payouts.config';
import type { CreatePayoutInput } from './payouts.provider';
import { applyPayoutResult, withLockedWithdrawal } from './withdrawals.settlement';

/** A `payout.requested` outbox event to run through RazorpayX. */
export interface PayoutJob {
  eventId: string;
}

const MINUTE_MS = 60_000;

/**
 * The `payouts` queue's work (backend spec, Queues: manual retry only, so the queue runs each job
 * once; an admin retries from the withdrawals screen).
 *
 * For one approved withdrawal it records that a payout attempt is starting, calls RazorpayX with
 * the withdrawal's fixed idempotency key, and applies the answer. A crash or timeout leaves the
 * withdrawal `processing` with an attempt on record: a human retries, and RazorpayX returns the
 * first payout if it was created. Money is never sent twice because the key never changes.
 */
export class PayoutProcessor {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly runtime: PayoutsRuntime,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async process(eventId: string): Promise<'sent' | 'skipped'> {
    const event = await this.prisma.outboxEvent.findUnique({ where: { id: eventId } });
    if (event?.type !== 'payout.requested') return 'skipped';
    const { withdrawalId } = event.payload as { withdrawalId: string };

    // Step 1, in a transaction: claim the attempt and read what to send.
    const claim = await withLockedWithdrawal(this.prisma, withdrawalId, async (tx, withdrawal) => {
      if (withdrawal.status !== 'processing' || withdrawal.providerPayoutId) return null;
      if (!withdrawal.payoutIdempotencyKey) return null;
      await tx.withdrawal.update({
        where: { id: withdrawal.id },
        data: { payoutAttemptedAt: this.now() },
      });
      const account = await tx.payoutAccount.findUniqueOrThrow({
        where: { id: withdrawal.payoutAccountId },
      });
      const destination = this.runtime.vault.open(withdrawal.userId, account.destinationEnc);
      if (!destination) throw new Error('payout details could not be opened');
      const input: CreatePayoutInput = {
        idempotencyKey: withdrawal.payoutIdempotencyKey,
        amountPaise: Number(withdrawal.amountPaise),
        destination,
        fundAccountId: account.providerFundAccountId,
        referenceId: withdrawal.id,
        narration: 'Supporters payout',
      };
      return input;
    });

    if (claim) {
      // Step 2, outside any transaction (a network call): throwing here fails the job once, and
      // the withdrawal stays `processing` with `payout_attempted_at` set for an admin to retry.
      const payout = await this.runtime.provider.createPayout(claim);
      // Step 3: record the answer.
      await applyPayoutResult(this.prisma, withdrawalId, payout, this.now());
    }
    await this.prisma.outboxEvent.update({
      where: { id: eventId },
      data: { processedAt: this.now() },
    });
    return claim ? 'sent' : 'skipped';
  }

  /**
   * The poller: withdrawals RazorpayX has a payout for but has not reported on in 5 minutes
   * (a missed webhook) are fetched and settled.
   */
  async reconcileStale(): Promise<number> {
    const cutoff = new Date(this.now().getTime() - 5 * MINUTE_MS);
    const stale = await this.prisma.withdrawal.findMany({
      where: { status: 'processing', providerPayoutId: { not: null }, updatedAt: { lt: cutoff } },
      select: { id: true, providerPayoutId: true },
      take: 100,
    });
    let changed = 0;
    for (const { id, providerPayoutId } of stale) {
      if (!providerPayoutId) continue;
      const payout = await this.runtime.provider.fetchPayout(providerPayoutId);
      const result = await applyPayoutResult(this.prisma, id, payout, this.now());
      if (result === 'completed' || result === 'failed') changed += 1;
    }
    return changed;
  }
}
