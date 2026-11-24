'use client';

import type { PremiumCheckoutResult, PremiumStatus } from '@supporters/shared';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Crown, Download, TriangleAlert } from 'lucide-react';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/lib/api/errors';
import { ListingChooser } from './listing-chooser';
import {
  INVOICES_KEY,
  PREMIUM_KEY,
  cancelPremium,
  completeFakeCheckout,
  fetchInvoice,
  fetchInvoices,
  fetchPremium,
  startCheckout,
} from './premium-api';
import {
  CONFIRM_TIMEOUT_MS,
  PERK_LABELS,
  POLL_INTERVAL_MS,
  canBuy,
  canCancel,
  describeStatus,
  formatMoney,
} from './premium-view';

/** The slice of Razorpay Checkout this page uses (checkout.razorpay.com/v1/checkout.js). */
interface RazorpayCheckout {
  open(): void;
  on(event: 'payment.failed', handler: () => void): void;
}
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayCheckout;
  }
}

const TONES = {
  neutral: 'border-border bg-card text-foreground',
  success: 'border-success bg-success-soft text-success',
  info: 'border-primary bg-primary-soft text-primary',
  warning: 'border-warning bg-warning-soft text-warning',
} as const;

type Phase = 'idle' | 'confirming' | 'slow';

/**
 * Premium on the web (web spec, Mutations: Premium checkout). The Razorpay popup's success
 * callback only starts the wait: Premium shows as active when `GET /v1/me/business/premium`
 * says so, which the API sets from the verified webhook.
 */
export function PremiumPanel({ initial, nonce }: { initial: PremiumStatus; nonce: string }) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>('idle');
  const [scriptReady, setScriptReady] = useState(false);
  const [fakeCheckout, setFakeCheckout] = useState<PremiumCheckoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConfirmingCancel, setIsConfirmingCancel] = useState(false);
  const attemptKey = useRef(crypto.randomUUID());
  const startedAt = useRef(0);

  const { data: status = initial } = useQuery({
    queryKey: PREMIUM_KEY,
    queryFn: fetchPremium,
    initialData: initial,
    refetchInterval: (query) =>
      phase === 'confirming' && query.state.data?.state !== 'active' ? POLL_INTERVAL_MS : false,
  });
  // Waiting ends by itself when the API reports active (the verified webhook has landed).
  const isWaiting = phase === 'confirming' && status.state !== 'active';
  const isConfirmed = phase === 'confirming' && status.state === 'active';

  useEffect(() => {
    if (isConfirmed) void queryClient.invalidateQueries({ queryKey: INVOICES_KEY });
  }, [isConfirmed, queryClient]);

  // The webhook never came: say so, without asking the buyer to pay again.
  useEffect(() => {
    if (!isWaiting) return;
    const timer = setTimeout(
      () => setPhase('slow'),
      Math.max(0, CONFIRM_TIMEOUT_MS - (Date.now() - startedAt.current)),
    );
    return () => clearTimeout(timer);
  }, [isWaiting]);

  function beginWaiting() {
    startedAt.current = Date.now();
    setFakeCheckout(null);
    setPhase('confirming');
    attemptKey.current = crypto.randomUUID();
  }

  const buy = useMutation({
    mutationFn: () => startCheckout({}, attemptKey.current),
    onError: (e) => setError(errorMessage(e)),
    onSuccess: (checkout) => {
      setError(null);
      if (checkout.provider === 'fake') {
        // Development only: the API registers the fake provider only outside deployed environments.
        setFakeCheckout(checkout);
        return;
      }
      if (!window.Razorpay) {
        setError('Payment is still loading. Try again in a moment.');
        return;
      }
      const popup = new window.Razorpay({
        key: checkout.checkout.keyId,
        subscription_id: checkout.checkout.providerSubscriptionId,
        name: 'Supporters Premium',
        description: 'Premium for one year, renews yearly',
        // Never trusted: it only starts the wait for the confirmed status.
        handler: beginWaiting,
        modal: { ondismiss: () => void queryClient.invalidateQueries({ queryKey: PREMIUM_KEY }) },
      });
      popup.on('payment.failed', () => setError('The payment did not go through. Try again.'));
      popup.open();
    },
  });

  const fakePay = useMutation({
    mutationFn: (subscriptionId: string) => completeFakeCheckout(subscriptionId),
    onError: (e) => setError(errorMessage(e)),
    onSuccess: () => {
      beginWaiting();
      void queryClient.invalidateQueries({ queryKey: PREMIUM_KEY });
    },
  });

  const cancel = useMutation({
    mutationFn: cancelPremium,
    onError: (e) => setError(errorMessage(e)),
    onSuccess: (next) => {
      setError(null);
      setIsConfirmingCancel(false);
      queryClient.setQueryData(PREMIUM_KEY, next);
    },
  });

  const view = describeStatus(status);
  const price = formatMoney(status.price);

  return (
    <div className="space-y-6">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        nonce={nonce}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />

      {isWaiting && (
        <div role="status" aria-live="polite" className={`rounded-2xl border p-4 ${TONES.info}`}>
          <p className="text-body font-bold">Confirming your payment…</p>
          <p className="text-caption">
            This takes a few seconds. Premium switches on when the bank confirms it.
          </p>
        </div>
      )}
      {phase === 'slow' && (
        <div role="status" className={`rounded-2xl border p-4 ${TONES.warning}`}>
          <p className="text-body font-bold">Still waiting for confirmation</p>
          <p className="text-caption">
            If you were charged, Premium will appear here by itself, and you will get a
            notification. You do not need to pay again.
          </p>
        </div>
      )}

      <section
        aria-labelledby="premium-status"
        className={`space-y-1 rounded-2xl border p-5 ${TONES[view.tone]}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="premium-status" className="text-body font-bold">
            {view.title}
          </h2>
          {status.state === 'active' && <Badge>Active</Badge>}
          {status.state === 'grace' && (
            <Badge variant="outline">
              <TriangleAlert aria-hidden /> Grace period
            </Badge>
          )}
        </div>
        <p className="text-caption">{view.body}</p>
        {status.refundableUntil && (
          <p className="text-caption">
            Not happy? A first purchase can be refunded in full until{' '}
            {new Date(status.refundableUntil).toLocaleDateString('en-IN', {
              timeZone: 'Asia/Kolkata',
            })}
            . Write to support to ask.
          </p>
        )}
      </section>

      <section
        aria-labelledby="premium-plan"
        className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="premium-plan" className="flex items-center gap-2 text-body font-bold">
              <Crown className="size-5 text-warning" aria-hidden /> Supporters Premium
            </h2>
            <p className="text-caption text-muted-foreground">Per business, billed yearly</p>
          </div>
          <p className="text-right">
            <span className="text-h3 font-bold">{price}</span>
            <span className="block text-caption text-muted-foreground">a year, GST included</span>
          </p>
        </div>
        <ul className="space-y-2">
          {status.perks.map((perk) => (
            <li key={perk} className="flex items-start gap-2 text-caption">
              <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              {PERK_LABELS[perk] ?? perk}
            </li>
          ))}
        </ul>

        {error && (
          <p role="alert" className="text-caption text-destructive">
            {error}
          </p>
        )}

        {canBuy(status) && !isWaiting && (
          <Button
            onClick={() => buy.mutate()}
            disabled={buy.isPending || (!scriptReady && !fakeCheckout)}
            className="w-full sm:w-auto"
          >
            {buy.isPending
              ? 'Starting…'
              : status.state === 'expired'
                ? `Renew Premium for ${price}`
                : `Go Premium for ${price}`}
          </Button>
        )}
        <p className="text-caption text-muted-foreground">
          Renews every year through UPI AutoPay, card or netbanking. Cancel any time: Premium stays
          on until the end of the year you paid for. Renewals are not refunded.
        </p>

        {fakeCheckout && (
          <div
            role="dialog"
            aria-label="Development checkout"
            className="space-y-3 rounded-xl border border-dashed border-warning p-4"
          >
            <p className="text-body font-bold">Development checkout</p>
            <p className="text-caption text-muted-foreground">
              This stands in for Razorpay Checkout and exists only when the API runs with the fake
              payment provider. No money moves.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => fakePay.mutate(fakeCheckout.subscriptionId)}
                disabled={fakePay.isPending}
              >
                Pay {price} (test)
              </Button>
              <Button variant="outline" onClick={() => setFakeCheckout(null)}>
                Close
              </Button>
            </div>
          </div>
        )}

        {canCancel(status) && (
          <div className="border-t border-border pt-4">
            {isConfirmingCancel ? (
              <div className="space-y-2">
                <p className="text-caption">
                  Premium will stay on until{' '}
                  {status.expiresAt
                    ? new Date(status.expiresAt).toLocaleDateString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                      })
                    : 'the end of your year'}
                  , then end. You will not be charged again.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => cancel.mutate()}
                    disabled={cancel.isPending}
                  >
                    Yes, turn off auto-renew
                  </Button>
                  <Button variant="outline" onClick={() => setIsConfirmingCancel(false)}>
                    Keep it on
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setIsConfirmingCancel(true)}>
                Turn off auto-renew
              </Button>
            )}
          </div>
        )}
      </section>

      {status.heldListingCount > 0 && !status.isPremium && <ListingChooser />}

      <InvoiceList />
    </div>
  );
}

function InvoiceList() {
  const { data, isPending, isError } = useQuery({
    queryKey: INVOICES_KEY,
    queryFn: fetchInvoices,
    // The PDF is rendered by a worker a moment after payment.
    refetchInterval: (query) =>
      query.state.data?.data.some((invoice) => !invoice.isPdfReady) ? 3_000 : false,
  });
  const download = useMutation({
    mutationFn: fetchInvoice,
    onSuccess: (invoice) => {
      if (invoice.downloadUrl) window.location.assign(invoice.downloadUrl);
    },
  });

  return (
    <section
      aria-labelledby="premium-invoices"
      className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-xs"
    >
      <h2 id="premium-invoices" className="text-body font-bold">
        Invoices
      </h2>
      {isPending && <p className="text-caption text-muted-foreground">Loading…</p>}
      {isError && (
        <p role="alert" className="text-caption text-destructive">
          We could not load your invoices. Reload the page.
        </p>
      )}
      {data && data.data.length === 0 && (
        <p className="text-caption text-muted-foreground">
          Your GST invoices appear here after a payment.
        </p>
      )}
      <ul className="divide-y divide-border">
        {data?.data.map((invoice) => (
          <li key={invoice.id} className="flex items-center justify-between gap-3 py-3">
            <div>
              <p className="text-caption font-bold">{invoice.number}</p>
              <p className="text-caption text-muted-foreground">
                {new Date(invoice.issuedAt).toLocaleDateString('en-IN', {
                  timeZone: 'Asia/Kolkata',
                })}{' '}
                · {formatMoney(invoice.total)}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!invoice.isPdfReady || download.isPending}
              onClick={() => download.mutate(invoice.id)}
              aria-label={`Download invoice ${invoice.number}`}
            >
              <Download aria-hidden /> {invoice.isPdfReady ? 'Download' : 'Preparing…'}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
