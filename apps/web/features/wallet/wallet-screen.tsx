'use client';

import type { LedgerEntry, Withdrawal } from '@supporters/shared';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { Skeleton } from '@supporters/ui-web/components/skeleton';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Receipt, Wallet } from 'lucide-react';
import Link from 'next/link';
import { EmptyPanel } from '@/components/catalog/empty-panel';
import { errorMessage } from '@/lib/api/errors';
import { ledgerQueryOptions, walletQueryOptions, withdrawalsQueryOptions } from './wallet-api';
import {
  WITHDRAWAL_STATUS_LABELS,
  formatDate,
  formatDateTime,
  formatRupees,
} from './wallet-format';

const WITHDRAWAL_VARIANT = {
  pending: 'secondary',
  processing: 'secondary',
  completed: 'default',
  rejected: 'destructive',
  failed: 'destructive',
} as const;

/** `/wallet`: the balance, withdrawals and the ledger (backend spec: balance is SUM of the ledger). */
export function WalletScreen() {
  const wallet = useQuery(walletQueryOptions);
  const withdrawals = useInfiniteQuery(withdrawalsQueryOptions);
  const ledger = useInfiniteQuery(ledgerQueryOptions);

  if (wallet.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (wallet.isError) {
    return (
      <p role="alert" className="text-body-sm text-destructive">
        {errorMessage(wallet.error)}
      </p>
    );
  }

  const { balance, reserved, lifetimeEarned, minWithdrawal } = wallet.data;
  const withdrawalRows = withdrawals.data?.pages.flatMap((page) => page.data) ?? [];
  const entries = ledger.data?.pages.flatMap((page) => page.data) ?? [];
  const canWithdraw = balance.amountPaise >= minWithdrawal.amountPaise;

  return (
    <div className="space-y-6">
      <section
        aria-labelledby="wallet-balance-heading"
        className="space-y-4 rounded-3xl bg-primary p-6 text-primary-foreground"
      >
        <div className="flex items-center gap-2 text-caption font-semibold uppercase opacity-80">
          <Wallet className="size-4" aria-hidden />
          <h2 id="wallet-balance-heading">Available to withdraw</h2>
        </div>
        <p className="font-mono text-display font-black">{formatRupees(balance.amountPaise)}</p>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="secondary">
            <Link href="/wallet/withdraw">Withdraw money</Link>
          </Button>
          <Link href="/referral" className="text-body-sm font-semibold underline">
            Earn more
          </Link>
        </div>
        {!canWithdraw && (
          <p className="text-caption opacity-80">
            You can withdraw from {formatRupees(minWithdrawal.amountPaise)}.
          </p>
        )}
      </section>

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <dt className="text-caption text-muted-foreground">Earned so far</dt>
          <dd className="text-title font-black text-foreground">
            {formatRupees(lifetimeEarned.amountPaise)}
          </dd>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <dt className="text-caption text-muted-foreground">Being withdrawn</dt>
          <dd className="text-title font-black text-foreground">
            {formatRupees(reserved.amountPaise)}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="withdrawals-heading" className="space-y-3">
        <h2 id="withdrawals-heading" className="text-body font-bold text-foreground">
          Withdrawals
        </h2>
        {withdrawals.isError ? (
          <p role="alert" className="text-body-sm text-destructive">
            {errorMessage(withdrawals.error)}
          </p>
        ) : withdrawalRows.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">
            {withdrawals.isPending ? 'Loading...' : 'You have not withdrawn anything yet.'}
          </p>
        ) : (
          <ul className="space-y-2">
            {withdrawalRows.map((withdrawal) => (
              <WithdrawalRow key={withdrawal.id} withdrawal={withdrawal} />
            ))}
          </ul>
        )}
        {withdrawals.hasNextPage && (
          <Button
            type="button"
            variant="outline"
            disabled={withdrawals.isFetchingNextPage}
            onClick={() => void withdrawals.fetchNextPage()}
          >
            {withdrawals.isFetchingNextPage ? 'Loading...' : 'Load more'}
          </Button>
        )}
      </section>

      <section aria-labelledby="ledger-heading" className="space-y-3">
        <h2 id="ledger-heading" className="text-body font-bold text-foreground">
          History
        </h2>
        {ledger.isError ? (
          <p role="alert" className="text-body-sm text-destructive">
            {errorMessage(ledger.error)}
          </p>
        ) : entries.length === 0 && !ledger.isPending ? (
          <EmptyPanel
            icon={Receipt}
            title="Nothing here yet"
            description="Referral rewards and withdrawals show up here."
          />
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {entries.map((entry) => (
              <LedgerRow key={entry.id} entry={entry} />
            ))}
          </ul>
        )}
        {ledger.hasNextPage && (
          <Button
            type="button"
            variant="outline"
            disabled={ledger.isFetchingNextPage}
            onClick={() => void ledger.fetchNextPage()}
          >
            {ledger.isFetchingNextPage ? 'Loading...' : 'Load more'}
          </Button>
        )}
      </section>
    </div>
  );
}

function WithdrawalRow({ withdrawal }: { withdrawal: Withdrawal }) {
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="space-y-1">
        <p className="text-body-sm font-bold text-foreground">
          {formatRupees(withdrawal.amount.amountPaise)} to{' '}
          {withdrawal.method === 'upi' ? 'UPI' : 'bank account'}{' '}
          <span className="font-mono">{withdrawal.maskedDestination}</span>
        </p>
        <p className="text-caption text-muted-foreground">
          Requested {formatDateTime(withdrawal.createdAt)}
          {withdrawal.completedAt ? ` · paid ${formatDate(withdrawal.completedAt)}` : ''}
        </p>
        {withdrawal.reason && <p className="text-caption text-foreground">{withdrawal.reason}</p>}
      </div>
      <Badge variant={WITHDRAWAL_VARIANT[withdrawal.status]}>
        {WITHDRAWAL_STATUS_LABELS[withdrawal.status]}
      </Badge>
    </li>
  );
}

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const isCredit = entry.amount.amountPaise > 0;
  const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
  return (
    <li className="flex items-center justify-between gap-4 p-4">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${isCredit ? 'bg-success/15 text-success' : 'bg-muted text-foreground'}`}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-body-sm font-bold text-foreground">{entry.description}</p>
          <p className="text-caption text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
        </div>
      </div>
      <p
        className={`font-mono text-body font-black ${isCredit ? 'text-success' : 'text-foreground'}`}
      >
        <span className="sr-only">{isCredit ? 'Credit ' : 'Debit '}</span>
        {isCredit ? '+' : '−'}
        {formatRupees(Math.abs(entry.amount.amountPaise))}
      </p>
    </li>
  );
}
