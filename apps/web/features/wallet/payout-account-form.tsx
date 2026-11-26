'use client';

import type { PayoutAccount } from '@supporters/shared';
import { WALLET } from '@supporters/shared';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { type SyntheticEvent, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { FormError, FormField } from '@/features/auth/form-field';
import { errorMessage } from '@/lib/api/errors';
import {
  EMPTY_PAYOUT_FORM,
  type PayoutFormErrors,
  type PayoutFormValues,
  parsePayoutForm,
} from './payout-form-values';
import { walletApi, walletKeys } from './wallet-api';
import { formatDateTime } from './wallet-format';

const VALIDATION_LABELS = {
  pending: 'Being verified by the bank',
  validated: 'Verified',
  failed: 'Could not be verified',
} as const;

/** The payout account: what is on file (masked), and the form to set or change it. */
export function PayoutAccountPanel({ account }: { account: PayoutAccount | null }) {
  const [isEditing, setEditing] = useState(account === null);
  return (
    <section
      aria-labelledby="payout-account-heading"
      className="space-y-4 rounded-2xl border border-border bg-card p-5"
    >
      <h2 id="payout-account-heading" className="text-body font-bold text-foreground">
        Where to send the money
      </h2>
      {account && !isEditing && (
        <div className="space-y-3">
          <dl className="grid gap-2 text-body-sm sm:grid-cols-2">
            <div>
              <dt className="text-caption text-muted-foreground">
                {account.method === 'upi' ? 'UPI id' : 'Bank account'}
              </dt>
              <dd className="font-mono font-semibold text-foreground">
                {account.maskedDestination}
              </dd>
            </div>
            <div>
              <dt className="text-caption text-muted-foreground">Name on the account</dt>
              <dd className="font-semibold text-foreground">{account.holderName}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={account.validationStatus === 'validated' ? 'default' : 'secondary'}>
              {VALIDATION_LABELS[account.validationStatus]}
            </Badge>
            {!account.isNameMatch && (
              <Badge variant="outline">Name differs from your profile: checked by our team</Badge>
            )}
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
            Change details
          </Button>
        </div>
      )}
      {isEditing && (
        <PayoutAccountForm
          hasAccount={account !== null}
          onDone={() => setEditing(false)}
          onCancel={account ? () => setEditing(false) : undefined}
        />
      )}
    </section>
  );
}

function PayoutAccountForm({
  hasAccount,
  onDone,
  onCancel,
}: {
  hasAccount: boolean;
  onDone: () => void;
  onCancel: (() => void) | undefined;
}) {
  const { showToast } = useApp();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<PayoutFormValues>(EMPTY_PAYOUT_FORM);
  const [errors, setErrors] = useState<PayoutFormErrors>({});
  const save = useMutation({
    mutationFn: walletApi.savePayoutAccount,
    onSuccess: () => {
      showToast('Payout details saved', 'success');
      void queryClient.invalidateQueries({ queryKey: walletKeys.payoutAccount });
      onDone();
    },
  });

  const set = <K extends keyof PayoutFormValues>(key: K, value: PayoutFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const handleSubmit = (event: SyntheticEvent) => {
    event.preventDefault();
    const result = parsePayoutForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    save.mutate(result.data);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {hasAccount && (
        <p className="rounded-xl bg-muted p-3 text-caption text-foreground">
          After you change these details, withdrawals are paused for{' '}
          {WALLET.payoutDetailsCooldownHours} hours and we alert you by push and email.
        </p>
      )}
      <fieldset className="space-y-2">
        <legend className="text-caption font-semibold text-foreground">Receive money by</legend>
        <div className="flex gap-2">
          {(['upi', 'bank'] as const).map((method) => (
            <Button
              key={method}
              type="button"
              variant={values.method === method ? 'default' : 'outline'}
              aria-pressed={values.method === method}
              onClick={() => set('method', method)}
            >
              {method === 'upi' ? 'UPI' : 'Bank account'}
            </Button>
          ))}
        </div>
      </fieldset>

      <FormField
        label="Name on the account"
        autoComplete="name"
        value={values.holderName}
        onChange={(event) => set('holderName', event.target.value)}
        error={errors.holderName}
      />
      {values.method === 'upi' ? (
        <FormField
          label="UPI id"
          placeholder="name@bank"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={values.upiId}
          onChange={(event) => set('upiId', event.target.value)}
          error={errors.upiId}
        />
      ) : (
        <>
          <FormField
            label="Account number"
            inputMode="numeric"
            autoComplete="off"
            value={values.accountNumber}
            onChange={(event) => set('accountNumber', event.target.value)}
            error={errors.accountNumber}
          />
          <FormField
            label="Confirm account number"
            inputMode="numeric"
            autoComplete="off"
            value={values.confirmAccountNumber}
            onChange={(event) => set('confirmAccountNumber', event.target.value)}
            error={errors.confirmAccountNumber}
          />
          <FormField
            label="IFSC"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            value={values.ifsc}
            onChange={(event) => set('ifsc', event.target.value)}
            error={errors.ifsc}
          />
        </>
      )}
      <p className="flex items-start gap-2 text-caption text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        Your details are encrypted. We show only the last digits, and the bank checks the name on
        the account.
      </p>
      <FormError message={save.isError ? errorMessage(save.error) : null} />
      <div className="flex gap-2">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Verifying...' : 'Save and verify'}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

/** When withdrawals open again after a details change, or null when nothing blocks them. */
export function withdrawalsBlockedUntil(account: PayoutAccount | null, now = Date.now()) {
  if (!account) return null;
  return Date.parse(account.withdrawalsAllowedAt) > now ? account.withdrawalsAllowedAt : null;
}

export const formatBlockedUntil = formatDateTime;
