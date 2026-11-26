'use client';

import type { AdminWithdrawal, WithdrawalStatus } from '@supporters/shared';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { Label } from '@supporters/ui-web/components/label';
import { Textarea } from '@supporters/ui-web/components/textarea';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { useId, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { flattenPages } from '@/features/social/use-feed';
import { formatRupees } from '@/features/wallet/wallet-format';
import { errorMessage } from '@/lib/api/errors';
import { adminApi, adminKeys } from './admin-api';
import { formatDateTime } from './admin-format';
import { AdminList, StatusTabs } from './admin-list';

const TABS: { value: WithdrawalStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Paying out' },
  { value: 'completed', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'rejected', label: 'Rejected' },
];

/** The withdrawal queue (product spec, Wallet): approve, or reject with a reason. */
export function WithdrawalQueue() {
  const [status, setStatus] = useState<WithdrawalStatus>('pending');
  const query = useInfiniteQuery({
    queryKey: adminKeys.withdrawals(status),
    queryFn: ({ pageParam }) => adminApi.withdrawals(status, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const items = flattenPages(query.data);
  return (
    <div className="space-y-4">
      <StatusTabs tabs={TABS} value={status} onChange={setStatus} />
      <AdminList
        query={query}
        isEmpty={items.length === 0}
        emptyText={status === 'pending' ? 'No withdrawals waiting.' : 'Nothing here yet.'}
      >
        {items.map((item) => (
          <WithdrawalCard key={item.id} item={item} />
        ))}
      </AdminList>
    </div>
  );
}

function WithdrawalCard({ item }: { item: AdminWithdrawal }) {
  const { showToast } = useApp();
  const queryClient = useQueryClient();
  const [isRejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const reasonId = useId();
  const decide = useMutation({
    mutationFn: (decision: 'approve' | 'reject' | 'retry') => {
      if (decision === 'approve') return adminApi.approveWithdrawal(item.id);
      if (decision === 'retry') return adminApi.retryWithdrawal(item.id);
      return adminApi.rejectWithdrawal(item.id, reason.trim());
    },
    onSuccess: (result) => {
      showToast(
        result.status === 'rejected' ? 'Withdrawal rejected, funds returned' : 'Withdrawal updated',
      );
      void queryClient.invalidateQueries({ queryKey: ['admin', 'withdrawals'] });
    },
    onError: (error) => showToast(errorMessage(error), 'error'),
  });
  const isReasonValid = reason.trim().length >= 5;

  return (
    <article className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-body font-bold text-foreground">
            {formatRupees(item.amount.amountPaise)} · {item.user.name}
          </h2>
          <p className="text-caption text-muted-foreground">
            Requested {formatDateTime(item.createdAt)}
          </p>
        </div>
        <Badge variant={item.status === 'pending' ? 'secondary' : 'outline'}>{item.status}</Badge>
      </header>

      {item.isNameMismatch && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl bg-warning/15 p-3 text-caption font-semibold text-foreground"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          The name on the account does not match the profile name. Check before approving.
        </p>
      )}

      <dl className="grid gap-2 text-caption sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Profile name</dt>
          <dd className="font-semibold text-foreground">{item.user.name}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Name on the account</dt>
          <dd className="font-semibold text-foreground">{item.holderName}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Name the bank returned</dt>
          <dd className="text-foreground">{item.registeredName ?? 'Not returned'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">
            {item.method === 'upi' ? 'UPI id' : 'Bank account'}
          </dt>
          <dd className="font-mono text-foreground">{item.maskedDestination}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Payout details in place for</dt>
          <dd className="text-foreground">{item.payoutAccountAgeHours} hours at the request</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Bank verification</dt>
          <dd className="text-foreground">{item.validationStatus}</dd>
        </div>
        {item.rejectionReason && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Rejection reason</dt>
            <dd className="text-foreground">{item.rejectionReason}</dd>
          </div>
        )}
        {item.failureReason && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Payout failed</dt>
            <dd className="text-foreground">
              {item.failureReason}. The amount is back in the wallet.
            </dd>
          </div>
        )}
        {item.reviewer && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Decided by</dt>
            <dd className="text-foreground">
              {item.reviewer.name}
              {item.reviewedAt ? `, ${formatDateTime(item.reviewedAt)}` : ''}
            </dd>
          </div>
        )}
      </dl>

      {item.status === 'pending' && (
        <div className="space-y-3 border-t border-border pt-3">
          {isRejecting && (
            <div className="space-y-1.5">
              <Label htmlFor={reasonId}>Reason shown to the user</Label>
              <Textarea
                id={reasonId}
                value={reason}
                maxLength={300}
                onChange={(event) => setReason(event.target.value)}
                placeholder="For example: the name on the account does not match your profile"
              />
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {isRejecting ? (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={!isReasonValid || decide.isPending}
                  onClick={() => decide.mutate('reject')}
                >
                  Reject and return the money
                </Button>
                <Button type="button" variant="ghost" onClick={() => setRejecting(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  disabled={decide.isPending}
                  onClick={() => decide.mutate('approve')}
                >
                  Approve and pay out
                </Button>
                <Button type="button" variant="outline" onClick={() => setRejecting(true)}>
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>
      )}
      {item.status === 'processing' && (
        <div className="space-y-1 border-t border-border pt-3">
          <p className="text-caption text-muted-foreground">
            If the payout never reached the bank (no confirmation after a few minutes), send it
            again. The payment provider will not pay twice.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={decide.isPending}
            onClick={() => decide.mutate('retry')}
          >
            Retry payout
          </Button>
        </div>
      )}
    </article>
  );
}
