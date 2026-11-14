'use client';

import {
  type Quote,
  type Requirement,
  TEXT_LIMITS,
  pageSchema,
  productSchema,
  serviceSchema,
} from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@supporters/ui-web/components/dialog';
import { Input } from '@supporters/ui-web/components/input';
import { NativeSelect, NativeSelectOption } from '@supporters/ui-web/components/native-select';
import { Textarea } from '@supporters/ui-web/components/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Field } from '@/features/business/field';
import { chatKeys } from '@/features/messaging/chat-cache';
import { api } from '@/lib/api/client';
import {
  type QuoteErrors,
  type QuoteFormValues,
  emptyQuote,
  quoteErrorMessage,
  requirementQuantity,
  requirementTitle,
  toQuoteBody,
} from './requirement-form-values';
import { requirementKeys, requirementsApi } from './requirements-api';

interface QuoteDialogProps {
  requirement: Requirement | null;
  onClose: () => void;
}

/** Send a quote (product spec, Buyer requirements: Quotes). Verified businesses only. */
export function QuoteDialog({ requirement, onClose }: QuoteDialogProps) {
  return (
    <Dialog open={requirement !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-svh overflow-y-auto sm:max-w-lg">
        {requirement && <QuoteForm requirement={requirement} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

/** My published products and services, to attach one to the quote. */
function useMyListings() {
  return useQuery({
    queryKey: ['quote-listings'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const [products, services] = await Promise.all([
        api.request('/v1/me/business/products?status=published&limit=50'),
        api.request('/v1/me/business/services?status=published&limit=50'),
      ]);
      return [
        ...pageSchema(productSchema)
          .parse(products)
          .data.map((p) => ({ value: `product:${p.id}`, label: p.title })),
        ...pageSchema(serviceSchema)
          .parse(services)
          .data.map((s) => ({ value: `service:${s.id}`, label: s.title })),
      ];
    },
  });
}

function QuoteForm({ requirement, onClose }: { requirement: Requirement; onClose: () => void }) {
  const client = useQueryClient();
  const { showToast } = useApp();
  const [values, setValues] = useState<QuoteFormValues>(emptyQuote);
  const [errors, setErrors] = useState<QuoteErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  // One key per form, so a retried send never quotes twice.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [sent, setSent] = useState<Quote | null>(null);
  const listings = useMyListings();

  const send = useMutation({
    mutationFn: (body: Parameters<typeof requirementsApi.quote>[2]) =>
      requirementsApi.quote(requirement.id, idempotencyKey, body),
    onSuccess: (quote) => {
      setSent(quote);
      void client.invalidateQueries({ queryKey: requirementKeys.all });
      void client.invalidateQueries({ queryKey: chatKeys.inboxes });
      showToast('Quote sent to the buyer.', 'success');
    },
    onError: (error) => setFormError(quoteErrorMessage(error)),
  });

  const set = <K extends keyof QuoteFormValues>(key: K, value: QuoteFormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto size-12 text-success" aria-hidden />
        <DialogHeader className="items-center">
          <DialogTitle>Quote sent</DialogTitle>
          <DialogDescription>
            It is in your chat with {requirement.buyer.name}. Carry on the conversation there.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button asChild>
            <Link href={`/messages/${sent.conversationId}`}>Open chat</Link>
          </Button>
        </DialogFooter>
      </div>
    );
  }

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setFormError(null);
        const result = toQuoteBody(values);
        if (!result.ok) {
          setErrors(result.errors);
          return;
        }
        send.mutate(result.body);
      }}
    >
      <DialogHeader>
        <DialogTitle>Send a quote</DialogTitle>
        <DialogDescription>
          {requirementTitle(requirement)} · {requirementQuantity(requirement)} to{' '}
          {requirement.deliveryCity.name}
        </DialogDescription>
      </DialogHeader>

      <Field label="Your price (₹)" error={errors.price} hint="The total for the quantity asked.">
        {(control) => (
          <Input
            {...control}
            inputMode="decimal"
            autoComplete="off"
            value={values.price}
            onChange={(event) => set('price', event.target.value)}
          />
        )}
      </Field>

      <Field
        label="Message"
        error={errors.message}
        hint={`${values.message.trim().length}/${TEXT_LIMITS.quoteMessage.max}`}
      >
        {(control) => (
          <Textarea
            {...control}
            rows={4}
            maxLength={TEXT_LIMITS.quoteMessage.max}
            placeholder="Delivery time, terms, what is included"
            value={values.message}
            onChange={(event) => set('message', event.target.value)}
          />
        )}
      </Field>

      <Field label="Attach a listing (optional)" error={errors.listing}>
        {(control) => (
          <NativeSelect
            {...control}
            value={values.listing}
            onChange={(event) => set('listing', event.target.value)}
            disabled={listings.isPending}
          >
            <NativeSelectOption value="">None</NativeSelectOption>
            {(listings.data ?? []).map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
      </Field>

      {formError && (
        <p role="alert" className="text-body-sm text-destructive">
          {formError}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={send.isPending}>
          {send.isPending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          Send quote
        </Button>
      </DialogFooter>
    </form>
  );
}
