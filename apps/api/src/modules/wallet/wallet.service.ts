import {
  type LedgerEntry,
  LedgerEntryType,
  type PaginationQuery,
  type Wallet,
  WALLET,
} from '@supporters/shared';
import type { PrismaClient } from '../../generated/prisma/client';
import { toMoney } from '../../lib/money';
import { pageArgs, splitPage } from '../../lib/pagination';

export class WalletService {
  constructor(private readonly prisma: PrismaClient) {}

  /** `GET /me/wallet`. The balance is SUM(ledger): there is no stored balance to drift. */
  async get(userId: string): Promise<Wallet> {
    const [all, earned, reserved] = await Promise.all([
      this.prisma.walletLedger.aggregate({ where: { userId }, _sum: { amountPaise: true } }),
      this.prisma.walletLedger.aggregate({
        where: { userId, type: { in: [LedgerEntryType.ReferralReward, LedgerEntryType.Bonus] } },
        _sum: { amountPaise: true },
      }),
      this.prisma.withdrawal.aggregate({
        where: { userId, status: { in: ['pending', 'processing'] } },
        _sum: { amountPaise: true },
      }),
    ]);
    return {
      balance: toMoney(all._sum.amountPaise ?? 0n),
      // Already debited from the balance: shown so the user sees where the money is.
      reserved: toMoney(reserved._sum.amountPaise ?? 0n),
      lifetimeEarned: toMoney(earned._sum.amountPaise ?? 0n),
      minWithdrawal: toMoney(WALLET.minWithdrawalPaise),
    };
  }

  /** `GET /me/wallet/ledger`: newest first. */
  async ledger(userId: string, query: PaginationQuery) {
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.walletLedger.findMany({
      ...page,
      where: { ...page.where, userId },
    });
    const split = splitPage(rows, query.limit);
    return {
      data: split.rows.map((row): LedgerEntry => ({
        id: row.id,
        type: row.type,
        amount: toMoney(row.amountPaise),
        description: row.description,
        createdAt: row.createdAt.toISOString(),
      })),
      nextCursor: split.nextCursor,
    };
  }
}
