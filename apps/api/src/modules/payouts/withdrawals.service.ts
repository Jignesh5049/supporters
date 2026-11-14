import {
  type CreateWithdrawalInput,
  LedgerEntryType,
  type PaginationQuery,
  WALLET,
  type Withdrawal,
} from '@supporters/shared';
import type {
  PayoutAccount,
  PrismaClient,
  Withdrawal as WithdrawalRow,
} from '../../generated/prisma/client';
import { AppError, ErrorCode } from '../../lib/errors';
import { toMoney } from '../../lib/money';
import { pageArgs, splitPage } from '../../lib/pagination';
import { appendEntry, auditMoney, balanceOf, lockWallet } from '../wallet/wallet.ledger';
import { type PayoutsRuntime, requirePayouts } from './payouts.config';

const HOUR_MS = 3_600_000;

export const toWithdrawal = (
  row: WithdrawalRow & { payoutAccount: PayoutAccount },
): Withdrawal => ({
  id: row.id,
  amount: toMoney(row.amountPaise),
  status: row.status,
  method: row.payoutAccount.method,
  maskedDestination: row.payoutAccount.maskedDestination,
  reason: row.rejectionReason ?? row.failureReason,
  createdAt: row.createdAt.toISOString(),
  completedAt: row.completedAt?.toISOString() ?? null,
});

export class WithdrawalsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly runtime: PayoutsRuntime | null,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * `POST /me/withdrawals`. One transaction: lock the wallet row, check every rule against what is
   * true under the lock, reserve the amount with a ledger debit, audit. Two requests at once
   * queue on the lock, so the second sees the first's debit and its open withdrawal: nobody can
   * overdraw or hold two pending withdrawals. A retried Idempotency-Key returns the stored one.
   */
  async create(
    userId: string,
    idempotencyKey: string,
    input: CreateWithdrawalInput,
    audit: { ip: string; userAgent: string | null },
  ): Promise<{ withdrawal: Withdrawal; replayed: boolean }> {
    requirePayouts(this.runtime);
    const amount = BigInt(input.amountPaise);
    const now = this.now();

    return this.prisma.$transaction(async (tx) => {
      await lockWallet(tx, userId);

      const previous = await tx.withdrawal.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey } },
        include: { payoutAccount: true },
      });
      if (previous) {
        if (previous.amountPaise !== amount) {
          throw new AppError(
            422,
            ErrorCode.IdempotencyKeyReused,
            'This Idempotency-Key was used for another request',
          );
        }
        return { withdrawal: toWithdrawal(previous), replayed: true };
      }

      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { status: true },
      });
      if (user.status !== 'active') {
        throw new AppError(403, ErrorCode.AccountSuspended, 'This account is suspended');
      }
      if (amount < BigInt(WALLET.minWithdrawalPaise)) {
        throw new AppError(422, ErrorCode.WithdrawalBelowMinimum, 'Amount is below the minimum', {
          detail: `The minimum withdrawal is ₹${WALLET.minWithdrawalPaise / 100}.`,
        });
      }
      const open = await tx.withdrawal.findFirst({
        where: { userId, status: { in: ['pending', 'processing'] } },
        select: { id: true },
      });
      if (open) {
        throw new AppError(
          409,
          ErrorCode.WithdrawalPending,
          'You already have a withdrawal in progress',
        );
      }

      const account = await tx.payoutAccount.findFirst({ where: { userId, supersededAt: null } });
      if (!account) {
        throw new AppError(409, ErrorCode.PayoutAccountRequired, 'Add a payout account first');
      }
      if (account.validationStatus !== 'validated') {
        throw new AppError(
          409,
          ErrorCode.PayoutAccountNotValidated,
          'Your payout account is still being verified',
        );
      }
      const allowedAt = account.createdAt.getTime() + WALLET.payoutDetailsCooldownHours * HOUR_MS;
      if (now.getTime() < allowedAt) {
        throw new AppError(
          409,
          ErrorCode.PayoutDetailsRecentlyChanged,
          'Withdrawals are paused after a payout details change',
          {
            detail: `You can withdraw after ${new Date(allowedAt).toISOString()}.`,
            retryAfter: Math.ceil((allowedAt - now.getTime()) / 1000),
          },
        );
      }
      if (amount > (await balanceOf(tx, userId))) {
        throw new AppError(409, ErrorCode.InsufficientBalance, 'Your balance is too low');
      }

      const row = await tx.withdrawal.create({
        data: {
          userId,
          payoutAccountId: account.id,
          amountPaise: amount,
          idempotencyKey,
          isNameMismatch: !account.isNameMatch,
        },
        include: { payoutAccount: true },
      });
      await appendEntry(tx, {
        userId,
        type: LedgerEntryType.Withdrawal,
        amountPaise: -amount,
        entryKey: `withdrawal:${row.id}`,
        description: 'Withdrawal',
        withdrawalId: row.id,
      });
      await auditMoney(
        tx,
        { userId, kind: 'user', ip: audit.ip, userAgent: audit.userAgent },
        {
          action: 'wallet.withdrawal_request',
          targetType: 'withdrawal',
          targetId: row.id,
          metadata: {
            amountPaise: Number(amount),
            isNameMismatch: row.isNameMismatch,
            payoutAccountId: account.id,
          },
        },
      );
      return { withdrawal: toWithdrawal(row), replayed: false };
    });
  }

  /** `GET /me/withdrawals`: newest first. */
  async list(userId: string, query: PaginationQuery) {
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.withdrawal.findMany({
      ...page,
      where: { ...page.where, userId },
      include: { payoutAccount: true },
    });
    const split = splitPage(rows, query.limit);
    return { data: split.rows.map(toWithdrawal), nextCursor: split.nextCursor };
  }
}
