'use client';

import { WALLET, type Withdrawal } from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { Skeleton } from '@supporters/ui-web/components/skeleton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { type SyntheticEvent, useRef, useState } from 'react';
import { FormError, FormField } from '@/features/auth/form-field';
import { ApiError, errorMessage } from '@/lib/api/errors';
import {
  PayoutAccountPanel,
  formatBlockedUntil,
  withdrawalsBlockedUntil,
} from './payout-account-form';
import { payoutAccountQueryOptions, walletApi, walletKeys, walletQueryOptions } from './wallet-api';
import { formatRupees, rupeesToPaise } from './wallet-format';

type Step = 'form' | 'review' | 'done';

/** Turns the API's money-flow errors into plain advice. */
function withdrawalError(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'WITHDRAWAL_PENDING':
        return 'You already have a withdrawal in progress. You can ask for another once it is paid.';
      case 'INSUFFICIENT_BALANCE':
        return 'Your balance is lower than this amount.';
      case 'PAYOUT_ACCOUNT_REQUIRED':
        return 'Add your payout details first.';
      case 'PAYOUT_ACCOUNT_NOT_VALIDATED':
        return 'Your payout details are still being verified. Try again in a few minutes.';
      case 'PAYOUT_DETAILS_RECENTLY_CHANGED':
        return 'You changed your payout details recently. For your safety, withdrawals open again 24 hours after the change.';
      case 'PAYOUTS_NOT_CONFIGURED':
        return 'Withdrawals are not open yet. Your balance is safe in your wallet.';
      default:
    }
  }
  return errorMessage(error);
}

/** `/wallet/withdraw`: payout details, then amount, review and confirm. */
export function WithdrawScreen() {
  const queryClient = useQueryClient();
  const wallet = useQuery(walletQueryOptions);
  const account = useQuery(payoutAccountQueryOptions);
  const [step, setStep] = useState<Step>('form');
  const [amountText, setAmountText] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  const [result, setResult] = useState<Withdrawal | null>(null);
  // One key for one intended withdrawal: pressing "Confirm" again after a network failure retries
  // the same request instead of risking a second one. Editing the amount starts a new intent.
  const idempotencyKey = useRef<string | null>(null);

  const withdraw = useMutation({
    mutationFn: (paise: number) => {
      idempotencyKey.current ??= crypto.randomUUID();
      return walletApi.withdraw(idempotencyKey.current, { amountPaise: paise });
    },
    onSuccess: (withdrawal) => {
      setResult(withdrawal);
      setStep('done');
      void queryClient.invalidateQueries({ queryKey: walletKeys.all });
    },
    onError: (error) => {
      // A definite answer from the server ends this intent; an unknown outcome keeps the key.
      if (error instanceof ApiError && error.status > 0 && error.status < 500) {
        idempotencyKey.current = null;
      }
    },
  });

  if (wallet.isPending || account.isPending) {
    return <Skeleton className="h-64 w-full" aria-busy="true" />;
  }
  if (wallet.isError || account.isError) {
    return (
      <p role="alert" className="text-body-sm text-destructive">
        {errorMessage(wallet.error ?? account.error)}
      </p>
    );
  }

  const { balance, minWithdrawal } = wallet.data;
  const payout = account.data;
  const blockedUntil = withdrawalsBlockedUntil(payout);
  const paise = rupeesToPaise(amountText);

  const handleReview = (event: SyntheticEvent) => {
    event.preventDefault();
    if (paise === null) {
      setAmountError('Enter an amount in rupees, like 250 or 250.50');
    } else if (paise < minWithdrawal.amountPaise) {
      setAmountError(`The minimum withdrawal is ${formatRupees(minWithdrawal.amountPaise)}`);
    } else if (paise > balance.amountPaise) {
      setAmountError(`You can withdraw up to ${formatRupees(balance.amountPaise)}`);
    } else {
      setAmountError(null);
      setStep('review');
    }
  };

  if (step === 'done' && result) {
    return (
      <div className="space-y-4 rounded-2xl border border-border bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden />
        <h2 className="text-title font-bold text-foreground">Withdrawal requested</h2>
        <p className="text-body-sm text-muted-foreground">
          {formatRupees(result.amount.amountPaise)} to {result.maskedDestination}. We approve
          requests within 3 working days and then pay out. You will get a notification at each step.
        </p>
        <Button asChild>
          <Link href="/wallet">Back to wallet</Link>
        </Button>
      </div>
    );
  }

  const isReady = payout?.validationStatus === 'validated' && blockedUntil === null;

  return (
    <div className="space-y-5">
      <PayoutAccountPanel account={payout} />

      <section
        aria-labelledby="withdraw-heading"
        className="space-y-4 rounded-2xl border border-border bg-card p-5"
      >
        <h2 id="withdraw-heading" className="text-body font-bold text-foreground">
          Withdraw
        </h2>
        <p className="text-body-sm text-muted-foreground">
          Available:{' '}
          <strong className="text-foreground">{formatRupees(balance.amountPaise)}</strong>. Minimum{' '}
          {formatRupees(minWithdrawal.amountPaise)}, one request at a time. We pay any fees.
        </p>

        {!payout && (
          <p className="text-body-sm text-foreground">Add your payout details above first.</p>
        )}
        {payout?.validationStatus === 'pending' && (
          <p className="text-body-sm text-foreground">
            Your payout details are being verified by the bank. This can take a few minutes.
          </p>
        )}
        {payout?.validationStatus === 'failed' && (
          <p role="alert" className="text-body-sm text-destructive">
            The bank could not verify these details. Change them above and try again.
          </p>
        )}
        {blockedUntil && (
          <p className="rounded-xl bg-muted p-3 text-body-sm text-foreground">
            You changed your payout details recently. Withdrawals open again on{' '}
            {formatBlockedUntil(blockedUntil)} ({WALLET.payoutDetailsCooldownHours}-hour safety
            pause).
          </p>
        )}

        {step === 'form' && (
          <form onSubmit={handleReview} noValidate className="space-y-3">
            <FormField
              label="Amount in rupees"
              inputMode="decimal"
              autoComplete="off"
              placeholder={`${minWithdrawal.amountPaise / 100}`}
              value={amountText}
              disabled={!isReady}
              onChange={(event) => {
                setAmountText(event.target.value);
                idempotencyKey.current = null;
              }}
              error={amountError ?? undefined}
            />
            <Button type="submit" disabled={!isReady}>
              Review
            </Button>
          </form>
        )}

        {step === 'review' && paise !== null && payout && (
          <div className="space-y-4">
            <dl className="space-y-2 rounded-xl bg-muted p-4 text-body-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-bold text-foreground">{formatRupees(paise)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">To</dt>
                <dd className="font-mono font-semibold text-foreground">
                  {payout.maskedDestination}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="font-semibold text-foreground">{payout.holderName}</dd>
              </div>
            </dl>
            <FormError message={withdraw.isError ? withdrawalError(withdraw.error) : null} />
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={withdraw.isPending}
                onClick={() => withdraw.mutate(paise)}
              >
                {withdraw.isPending ? 'Sending...' : 'Confirm withdrawal'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={withdraw.isPending}
                onClick={() => {
                  withdraw.reset();
                  setStep('form');
                }}
              >
                <ArrowLeft aria-hidden /> Edit
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
