import {
  type AdminBonusInput,
  type AdminWithdrawal,
  type AdminWithdrawalsQuery,
  LedgerEntryType,
  type LedgerEntry,
  type Page,
  type RejectWithdrawalInput,
  WALLET,
} from '@supporters/shared';
import type {
  PayoutAccount,
  Prisma,
  PrismaClient,
  Withdrawal,
} from '../../generated/prisma/client';
import { AppError, ErrorCode, notFound } from '../../lib/errors';
import { toMoney } from '../../lib/money';
import { splitPage } from '../../lib/pagination';
import {
  approveWithdrawal,
  rejectWithdrawal,
  retryPayout,
} from '../payouts/withdrawals.settlement';
import { type WalletActor, appendEntry, auditMoney, lockWallet } from '../wallet/wallet.ledger';
import type { AdminActor } from './audit.service';
import { queuePageArgs } from './queue-pagination';

const HOUR_MS = 3_600_000;

const include = {
  user: { select: { id: true, name: true } },
  reviewer: { select: { id: true, name: true } },
  payoutAccount: true,
} satisfies Prisma.WithdrawalInclude;
type Row = Withdrawal & {
  user: { id: string; name: string };
  reviewer: { id: string; name: string } | null;
  payoutAccount: PayoutAccount;
};

const toAdminWithdrawal = (row: Row): AdminWithdrawal => ({
  id: row.id,
  user: row.user,
  amount: toMoney(row.amountPaise),
  status: row.status,
  method: row.payoutAccount.method,
  maskedDestination: row.payoutAccount.maskedDestination,
  holderName: row.payoutAccount.holderName,
  registeredName: row.payoutAccount.registeredName,
  validationStatus: row.payoutAccount.validationStatus,
  isNameMismatch: row.isNameMismatch,
  payoutAccountAgeHours: Math.max(
    0,
    Math.floor((row.createdAt.getTime() - row.payoutAccount.createdAt.getTime()) / HOUR_MS),
  ),
  rejectionReason: row.rejectionReason,
  failureReason: row.failureReason,
  reviewer: row.reviewer,
  reviewedAt: row.reviewedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  completedAt: row.completedAt?.toISOString() ?? null,
});

const asWalletActor = (actor: AdminActor): WalletActor => ({
  userId: actor.userId,
  kind: 'admin',
  ip: actor.ip,
  userAgent: actor.userAgent,
});

/** The withdrawal queue and wallet bonuses (backend spec, Endpoint map: Admin). */
export class AdminWithdrawalsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Pending requests oldest first, so the longest wait is on top (3 working days target). */
  async list(query: AdminWithdrawalsQuery): Promise<Page<AdminWithdrawal>> {
    const page = queuePageArgs(
      query.cursor,
      query.limit,
      query.status === 'pending' ? 'asc' : 'desc',
    );
    const rows = await this.prisma.withdrawal.findMany({
      ...page,
      where: { ...page.where, status: query.status },
      include,
    });
    const split = splitPage(rows, query.limit);
    return { data: split.rows.map(toAdminWithdrawal), nextCursor: split.nextCursor };
  }

  private async get(id: string): Promise<AdminWithdrawal> {
    const row = await this.prisma.withdrawal.findUnique({ where: { id }, include });
    if (!row) throw notFound();
    return toAdminWithdrawal(row);
  }

  async approve(actor: AdminActor, id: string): Promise<AdminWithdrawal> {
    await approveWithdrawal(this.prisma, asWalletActor(actor), id, this.now());
    return this.get(id);
  }

  async reject(
    actor: AdminActor,
    id: string,
    input: RejectWithdrawalInput,
  ): Promise<AdminWithdrawal> {
    await rejectWithdrawal(this.prisma, asWalletActor(actor), id, input.reason, this.now());
    return this.get(id);
  }

  async retry(actor: AdminActor, id: string): Promise<AdminWithdrawal> {
    await retryPayout(this.prisma, asWalletActor(actor), id);
    return this.get(id);
  }

  /**
   * `POST /admin/wallet/bonus`: credits a user, with a reason shown in their ledger and kept in the
   * audit log. The Idempotency-Key makes a double click one bonus. An admin cannot credit an admin
   * account (or themselves), and nobody can credit a suspended or deleted one.
   */
  async bonus(
    actor: AdminActor,
    idempotencyKey: string,
    input: AdminBonusInput,
  ): Promise<{ entry: LedgerEntry; replayed: boolean }> {
    const target = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, role: true, status: true },
    });
    if (!target || target.role !== 'user') throw notFound();
    if (target.status !== 'active') {
      throw new AppError(409, ErrorCode.Conflict, 'This account is not active');
    }
    const amount = BigInt(input.amountPaise);
    if (amount > BigInt(WALLET.maxBonusPaise)) {
      throw new AppError(422, ErrorCode.ValidationFailed, 'Bonus is above the limit');
    }
    const entryKey = `bonus:${actor.userId}:${idempotencyKey}`;

    return this.prisma.$transaction(async (tx) => {
      await lockWallet(tx, input.userId);
      const existing = await tx.walletLedger.findUnique({ where: { entryKey } });
      if (existing) {
        if (existing.userId !== input.userId || existing.amountPaise !== amount) {
          throw new AppError(
            422,
            ErrorCode.IdempotencyKeyReused,
            'This Idempotency-Key was used for another request',
          );
        }
        return { entry: toEntry(existing), replayed: true };
      }
      await appendEntry(tx, {
        userId: input.userId,
        type: LedgerEntryType.Bonus,
        amountPaise: amount,
        entryKey,
        description: input.reason,
      });
      const entry = await tx.walletLedger.findUniqueOrThrow({ where: { entryKey } });
      await auditMoney(tx, asWalletActor(actor), {
        action: 'wallet.bonus',
        targetType: 'user',
        targetId: input.userId,
        metadata: { amountPaise: input.amountPaise, reason: input.reason, ledgerEntryId: entry.id },
      });
      return { entry: toEntry(entry), replayed: false };
    });
  }
}

const toEntry = (row: {
  id: string;
  type: LedgerEntryType;
  amountPaise: bigint;
  description: string;
  createdAt: Date;
}): LedgerEntry => ({
  id: row.id,
  type: row.type,
  amount: toMoney(row.amountPaise),
  description: row.description,
  createdAt: row.createdAt.toISOString(),
});
