import type { LedgerEntryType } from '@supporters/shared';
import type { Prisma } from '../../generated/prisma/client';

/**
 * The only code that writes `wallet_ledger`. Every wallet change is ONE transaction that first
 * locks the user's wallet row (`SELECT ... FOR UPDATE`), then reads the balance, then appends
 * entries and an audit row (backend spec, Security: Payments and money). Locking before the read
 * is what stops two requests from both seeing the same balance.
 */

/** Creates the wallet row on first use, then holds a row lock until the transaction ends. */
export async function lockWallet(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  await tx.$executeRaw`
    INSERT INTO wallets (user_id, updated_at) VALUES (${userId}::uuid, now())
    ON CONFLICT (user_id) DO NOTHING`;
  await tx.$queryRaw`SELECT id FROM wallets WHERE user_id = ${userId}::uuid FOR UPDATE`;
}

/** SUM of the ledger. Call it after `lockWallet` when the result gates a write. */
export async function balanceOf(tx: Prisma.TransactionClient, userId: string): Promise<bigint> {
  const sum = await tx.walletLedger.aggregate({ where: { userId }, _sum: { amountPaise: true } });
  return sum._sum.amountPaise ?? 0n;
}

export interface LedgerPosting {
  userId: string;
  type: LedgerEntryType;
  /** Signed paise: credits positive, debits negative. */
  amountPaise: bigint;
  /** Unique per posting: a retried event or job finds its entry instead of adding a second. */
  entryKey: string;
  description: string;
  referralId?: string;
}

/** Appends one entry. Returns false when `entryKey` was already posted (idempotent replay). */
export async function appendEntry(
  tx: Prisma.TransactionClient,
  posting: LedgerPosting,
): Promise<boolean> {
  const rows = await tx.$executeRaw`
    INSERT INTO wallet_ledger (user_id, type, amount_paise, entry_key, description, referral_id)
    VALUES (${posting.userId}::uuid, ${posting.type}::ledger_entry_type, ${posting.amountPaise},
            ${posting.entryKey}, ${posting.description}, ${posting.referralId ?? null}::uuid)
    ON CONFLICT (entry_key) DO NOTHING`;
  return rows === 1;
}

/** Who did it: the account owner, an admin, or 'system' (a job acting for the owner). */
export interface WalletActor {
  userId: string;
  kind: 'user' | 'admin' | 'system';
  ip?: string | null;
  userAgent?: string | null;
}

/** The audit row of a money movement, in the same transaction as the movement. */
export async function auditMoney(
  tx: Prisma.TransactionClient,
  actor: WalletActor,
  entry: {
    action: string;
    targetType: string;
    targetId: string;
    /** Ids, amounts and statuses only: never payout details. */
    metadata: Prisma.InputJsonObject;
  },
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorUserId: actor.userId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      metadata: { ...entry.metadata, actorKind: actor.kind },
      ip: actor.ip ?? null,
      userAgent: actor.userAgent ?? null,
    },
  });
}
