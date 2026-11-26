import { LedgerEntryType } from '@supporters/shared';
import type { Prisma, PrismaClient, Withdrawal } from '../../generated/prisma/client';
import { AppError, ErrorCode, notFound } from '../../lib/errors';
import { recordEvent } from '../notifications/outbox';
import { type WalletActor, appendEntry, auditMoney, lockWallet } from '../wallet/wallet.ledger';
import type { ProviderPayout } from './payouts.provider';

/**
 * The withdrawal state machine. Every transition runs here, in one transaction, taking the locks
 * in one fixed order (the user's wallet row, then the withdrawal row), so two paths (an admin, a
 * webhook, the reconciler) can never both move the same withdrawal or return its funds twice.
 *
 *   pending ──approve──> processing ──payout processed──> completed
 *      │                     │ └──payout failed / reversed / cancelled──> failed (funds returned)
 *      └──reject (funds returned)──> rejected
 *   completed ──bank reversal──> failed (funds returned)
 */

export const invalidState = (detail: string) =>
  new AppError(409, ErrorCode.InvalidState, 'This withdrawal cannot be changed now', { detail });

/** Runs `fn` with the wallet and the withdrawal locked and freshly read. Null: no such withdrawal. */
export async function withLockedWithdrawal<T>(
  prisma: PrismaClient,
  withdrawalId: string,
  fn: (tx: Prisma.TransactionClient, withdrawal: Withdrawal) => Promise<T>,
): Promise<T | null> {
  return prisma.$transaction(async (tx) => {
    const found = await tx.withdrawal.findUnique({
      where: { id: withdrawalId },
      select: { userId: true },
    });
    if (!found) return null;
    await lockWallet(tx, found.userId);
    await tx.$queryRaw`SELECT id FROM withdrawals WHERE id = ${withdrawalId}::uuid FOR UPDATE`;
    const withdrawal = await tx.withdrawal.findUniqueOrThrow({ where: { id: withdrawalId } });
    return fn(tx, withdrawal);
  });
}

/** Puts the reserved amount back: a `reversal` entry, keyed so it can only ever be posted once. */
async function returnFunds(tx: Prisma.TransactionClient, withdrawal: Withdrawal, why: string) {
  await appendEntry(tx, {
    userId: withdrawal.userId,
    type: LedgerEntryType.Reversal,
    amountPaise: withdrawal.amountPaise,
    entryKey: `withdrawal-return:${withdrawal.id}`,
    description: why,
    withdrawalId: withdrawal.id,
  });
}

/** An admin approves: pending to processing, and the payouts job is queued through the outbox. */
export async function approveWithdrawal(
  prisma: PrismaClient,
  actor: WalletActor,
  withdrawalId: string,
  now: Date,
) {
  const result = await withLockedWithdrawal(prisma, withdrawalId, async (tx, withdrawal) => {
    if (withdrawal.status !== 'pending') {
      throw invalidState(`It is ${withdrawal.status}, not pending.`);
    }
    const [account, user] = await Promise.all([
      tx.payoutAccount.findUniqueOrThrow({ where: { id: withdrawal.payoutAccountId } }),
      tx.user.findUniqueOrThrow({ where: { id: withdrawal.userId }, select: { status: true } }),
    ]);
    if (user.status !== 'active') throw invalidState('The account is not active. Reject instead.');
    if (account.validationStatus !== 'validated') {
      throw invalidState('The payout account is not validated.');
    }
    await tx.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: 'processing',
        reviewedByUserId: actor.userId,
        reviewedAt: now,
        // Fixed here, once: every attempt for this withdrawal sends the same key to RazorpayX.
        payoutIdempotencyKey: `supporters-wd-${withdrawal.id}`,
      },
    });
    await auditMoney(tx, actor, {
      action: 'wallet.withdrawal_approve',
      targetType: 'withdrawal',
      targetId: withdrawal.id,
      metadata: {
        amountPaise: Number(withdrawal.amountPaise),
        isNameMismatch: withdrawal.isNameMismatch,
        userId: withdrawal.userId,
      },
    });
    await recordEvent(tx, 'withdrawal.approved', { withdrawalId: withdrawal.id });
    await recordEvent(tx, 'payout.requested', { withdrawalId: withdrawal.id });
    return true;
  });
  if (result === null) throw notFound();
}

/** An admin rejects with a reason; the reserved amount goes back to the wallet. */
export async function rejectWithdrawal(
  prisma: PrismaClient,
  actor: WalletActor,
  withdrawalId: string,
  reason: string,
  now: Date,
) {
  const result = await withLockedWithdrawal(prisma, withdrawalId, async (tx, withdrawal) => {
    if (withdrawal.status !== 'pending') {
      throw invalidState(`It is ${withdrawal.status}, not pending.`);
    }
    await tx.withdrawal.update({
      where: { id: withdrawal.id },
      data: {
        status: 'rejected',
        rejectionReason: reason,
        reviewedByUserId: actor.userId,
        reviewedAt: now,
      },
    });
    await returnFunds(tx, withdrawal, 'Withdrawal rejected');
    await auditMoney(tx, actor, {
      action: 'wallet.withdrawal_reject',
      targetType: 'withdrawal',
      targetId: withdrawal.id,
      metadata: { amountPaise: Number(withdrawal.amountPaise), reason, userId: withdrawal.userId },
    });
    await recordEvent(tx, 'withdrawal.rejected', { withdrawalId: withdrawal.id });
    return true;
  });
  if (result === null) throw notFound();
}

/**
 * Manual retry: queue the payouts job again for an approved withdrawal that has no payout yet (the
 * first attempt died with an unknown outcome). Safe, because the RazorpayX idempotency key is the
 * same: if the first call did create a payout, RazorpayX returns that one.
 */
export async function retryPayout(prisma: PrismaClient, actor: WalletActor, withdrawalId: string) {
  const result = await withLockedWithdrawal(prisma, withdrawalId, async (tx, withdrawal) => {
    if (withdrawal.status !== 'processing') {
      throw invalidState(`It is ${withdrawal.status}, not processing.`);
    }
    if (withdrawal.providerPayoutId) {
      throw invalidState('A payout already exists. It is reconciled from RazorpayX.');
    }
    await auditMoney(tx, actor, {
      action: 'wallet.payout_retry',
      targetType: 'withdrawal',
      targetId: withdrawal.id,
      metadata: { userId: withdrawal.userId },
    });
    await recordEvent(tx, 'payout.requested', { withdrawalId: withdrawal.id });
    return true;
  });
  if (result === null) throw notFound();
}

/**
 * Applies what RazorpayX says about the payout, from the job's own response, a webhook or the
 * poller. Idempotent: the same news twice changes nothing, and a withdrawal that is already in a
 * different final state is left alone (except a bank reversal after "processed").
 */
export async function applyPayoutResult(
  prisma: PrismaClient,
  withdrawalId: string,
  payout: ProviderPayout,
  now: Date,
): Promise<'completed' | 'failed' | 'open' | 'ignored'> {
  const outcome = await withLockedWithdrawal(prisma, withdrawalId, async (tx, withdrawal) => {
    const actor: WalletActor = { userId: withdrawal.userId, kind: 'system' };
    const isFailure = ['failed', 'reversed', 'cancelled'].includes(payout.status);

    if (withdrawal.status === 'processing') {
      if (withdrawal.providerPayoutId && withdrawal.providerPayoutId !== payout.payoutId) {
        return 'ignored' as const;
      }
      if (payout.status === 'processed') {
        await tx.withdrawal.update({
          where: { id: withdrawal.id },
          data: { status: 'completed', providerPayoutId: payout.payoutId, completedAt: now },
        });
        await auditMoney(tx, actor, {
          action: 'wallet.payout_completed',
          targetType: 'withdrawal',
          targetId: withdrawal.id,
          metadata: { amountPaise: Number(withdrawal.amountPaise) },
        });
        await recordEvent(tx, 'withdrawal.paid', { withdrawalId: withdrawal.id });
        return 'completed' as const;
      }
      if (isFailure) {
        await failWithdrawal(tx, withdrawal, payout, actor);
        return 'failed' as const;
      }
      if (!withdrawal.providerPayoutId) {
        await tx.withdrawal.update({
          where: { id: withdrawal.id },
          data: { providerPayoutId: payout.payoutId },
        });
      }
      return 'open' as const;
    }

    // The bank sent a paid-out transfer back days later: the money is ours again, so it returns to
    // the user's wallet. Any other news about a finished withdrawal is stale.
    if (withdrawal.status === 'completed' && payout.status === 'reversed') {
      if (withdrawal.providerPayoutId !== payout.payoutId) return 'ignored' as const;
      await failWithdrawal(tx, withdrawal, payout, actor);
      return 'failed' as const;
    }
    return 'ignored' as const;
  });
  return outcome ?? 'ignored';
}

async function failWithdrawal(
  tx: Prisma.TransactionClient,
  withdrawal: Withdrawal,
  payout: ProviderPayout,
  actor: WalletActor,
) {
  await tx.withdrawal.update({
    where: { id: withdrawal.id },
    data: {
      status: 'failed',
      providerPayoutId: payout.payoutId,
      // Always our own wording: the provider's text can name banks and accounts.
      failureReason: 'The bank could not complete the payout',
    },
  });
  await returnFunds(tx, withdrawal, 'Payout failed, amount returned');
  await auditMoney(tx, actor, {
    action: 'wallet.payout_failed',
    targetType: 'withdrawal',
    targetId: withdrawal.id,
    metadata: { amountPaise: Number(withdrawal.amountPaise), providerStatus: payout.status },
  });
  await recordEvent(tx, 'withdrawal.failed', { withdrawalId: withdrawal.id });
}
