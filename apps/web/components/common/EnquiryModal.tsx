'use client';

import {
  type Enquiry,
  type ListingRef,
  PRODUCT_UNITS,
  TEXT_LIMITS,
  citiesResponseSchema,
  pageSchema,
  productSchema,
  serviceSchema,
  statesResponseSchema,
} from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { Checkbox } from '@supporters/ui-web/components/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@supporters/ui-web/components/dialog';
import { Input } from '@supporters/ui-web/components/input';
import { Label } from '@supporters/ui-web/components/label';
import { NativeSelect, NativeSelectOption } from '@supporters/ui-web/components/native-select';
import { Textarea } from '@supporters/ui-web/components/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { z } from 'zod';
import { useApp } from '@/context/AppContext';
import { Field } from '@/features/business/field';
import { chatApi } from '@/features/messaging/chat-api';
import { chatKeys } from '@/features/messaging/chat-cache';
import {
  type EnquiryErrors,
  type EnquiryFormValues,
  emptyEnquiry,
  enquiryError,
  toEnquiryBody,
} from '@/features/messaging/enquiry-form-values';
import { api } from '@/lib/api/client';
import { unitLabel } from '@/lib/catalog/format';

/** Contact Supplier: product spec, "Messaging: DMs and enquiries". Mounted once in the root layout. */
export function EnquiryModal() {
  const { enquiryState, closeEnquiryModal } = useApp();
  return (
    <Dialog open={enquiryState.isOpen} onOpenChange={(open) => !open && closeEnquiryModal()}>
      <DialogContent className="max-h-svh overflow-y-auto sm:max-w-lg">
        {enquiryState.isOpen && (
          <EnquiryForm
            title={enquiryState.targetTitle ?? 'this business'}
            businessName={enquiryState.targetBusinessName ?? 'the supplier'}
            businessId={enquiryState.targetBusinessId}
            listing={enquiryState.targetListing}
            onClose={closeEnquiryModal}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

const uuid = z.uuid();
const HOUR_MS = 60 * 60 * 1000;

interface ListingOption {
  value: string;
  label: string;
}

/** The business's published products and services, for when the enquiry names no listing. */
function useBusinessListings(businessId: string | undefined, isEnabled: boolean) {
  return useQuery({
    queryKey: ['enquiry-listings', businessId],
    enabled: isEnabled && businessId !== undefined && uuid.safeParse(businessId).success,
    staleTime: HOUR_MS / 12,
    queryFn: async (): Promise<ListingOption[]> => {
      const [products, services] = await Promise.all([
        api.request(`/v1/businesses/${businessId}/products?limit=50`),
        api.request(`/v1/businesses/${businessId}/services?limit=50`),
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

function EnquiryForm({
  title,
  businessName,
  businessId,
  listing,
  onClose,
}: {
  title: string;
  businessName: string;
  businessId: string | undefined;
  listing: ListingRef | undefined;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const { showToast } = useApp();
  const [values, setValues] = useState<EnquiryFormValues>(() => emptyEnquiry(listing));
  const [stateCode, setStateCode] = useState('');
  const [errors, setErrors] = useState<EnquiryErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  // One key per form: a retry of the same enquiry returns the stored one, never a second.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [sent, setSent] = useState<Enquiry | null>(null);

  const listings = useBusinessListings(businessId, listing === undefined);
  const states = useQuery({
    queryKey: ['places', 'states'],
    staleTime: HOUR_MS,
    queryFn: async () => statesResponseSchema.parse(await api.request('/v1/places/states')).data,
  });
  const cities = useQuery({
    queryKey: ['places', 'cities', stateCode],
    enabled: stateCode !== '',
    staleTime: HOUR_MS,
    queryFn: async () =>
      citiesResponseSchema.parse(
        await api.request(`/v1/places/cities?state=${encodeURIComponent(stateCode)}`),
      ).data,
  });

  const send = useMutation({
    mutationFn: (body: Parameters<typeof chatApi.createEnquiry>[1]) =>
      chatApi.createEnquiry(idempotencyKey, body),
    onSuccess: (enquiry) => {
      setSent(enquiry);
      void client.invalidateQueries({ queryKey: chatKeys.inboxes });
      void client.invalidateQueries({ queryKey: chatKeys.myEnquiries });
      showToast(`Enquiry sent to ${businessName}.`, 'success');
    },
    onError: (error) => {
      const { message, fields } = enquiryError(error);
      setErrors(fields);
      setFormError(message);
    },
  });

  const set = <K extends keyof EnquiryFormValues>(key: K, value: EnquiryFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const result = toEnquiryBody(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    send.mutate(result.body);
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 aria-hidden className="size-8" />
        </span>
        <DialogTitle>Enquiry sent</DialogTitle>
        <DialogDescription>
          {businessName} has your enquiry and will reply in your messages.
        </DialogDescription>
        <div className="mt-2 flex w-full flex-col gap-2 sm:flex-row">
          <Button asChild className="flex-1" onClick={onClose}>
            <Link href={`/messages/${sent.conversationId}`}>Open the chat</Link>
          </Button>
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  const options = listing ? [] : (listings.data ?? []);
  const canPickListing = listing === undefined;

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>Contact supplier</DialogTitle>
        <DialogDescription>
          Send {businessName} a structured enquiry. It opens a chat and appears in their enquiry
          list.
        </DialogDescription>
      </DialogHeader>

      <Field
        label="Product or service"
        error={errors.listing}
        hint={canPickListing ? undefined : title}
      >
        {(control) =>
          canPickListing ? (
            <NativeSelect
              {...control}
              value={values.listing}
              disabled={listings.isPending && businessId !== undefined}
              onChange={(event) => set('listing', event.target.value)}
            >
              <NativeSelectOption value="">
                {listings.isPending && businessId !== undefined
                  ? 'Loading listings…'
                  : options.length > 0
                    ? 'Choose a listing'
                    : 'No published listings'}
              </NativeSelectOption>
              {options.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          ) : (
            <Input {...control} readOnly value={title} />
          )
        }
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Quantity" error={errors.quantity}>
          {(control) => (
            <Input
              {...control}
              inputMode="numeric"
              placeholder="e.g. 50"
              value={values.quantity}
              onChange={(event) => set('quantity', event.target.value)}
            />
          )}
        </Field>
        <Field label="Unit" error={errors.unit}>
          {(control) => (
            <NativeSelect
              {...control}
              value={values.unit}
              onChange={(event) => set('unit', event.target.value)}
            >
              <NativeSelectOption value="">Choose a unit</NativeSelectOption>
              {PRODUCT_UNITS.map((unit) => (
                <NativeSelectOption key={unit} value={unit}>
                  {unitLabel(unit)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Delivery state">
          {(control) => (
            <NativeSelect
              {...control}
              value={stateCode}
              onChange={(event) => {
                setStateCode(event.target.value);
                set('deliveryCityId', '');
              }}
            >
              <NativeSelectOption value="">Choose a state</NativeSelectOption>
              {states.data?.map((state) => (
                <NativeSelectOption key={state.id} value={state.code}>
                  {state.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </Field>
        <Field label="Delivery city" error={errors.deliveryCityId}>
          {(control) => (
            <NativeSelect
              {...control}
              value={values.deliveryCityId}
              disabled={!stateCode || cities.isPending}
              onChange={(event) => set('deliveryCityId', event.target.value)}
            >
              <NativeSelectOption value="">
                {stateCode
                  ? cities.isPending
                    ? 'Loading cities…'
                    : 'Choose a city'
                  : 'Choose a state first'}
              </NativeSelectOption>
              {cities.data?.map((city) => (
                <NativeSelectOption key={city.id} value={city.id}>
                  {city.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          )}
        </Field>
      </div>

      <Field
        label="Message"
        error={errors.message}
        hint={`${TEXT_LIMITS.enquiryMessage.min} to ${TEXT_LIMITS.enquiryMessage.max.toLocaleString('en-IN')} characters. Mention specifications, GST needs or timing.`}
      >
        {(control) => (
          <Textarea
            {...control}
            rows={4}
            maxLength={TEXT_LIMITS.enquiryMessage.max}
            value={values.message}
            onChange={(event) => set('message', event.target.value)}
          />
        )}
      </Field>

      <div className="flex items-start gap-2">
        <Checkbox
          id="enquiry-share-phone"
          checked={values.sharePhone}
          onCheckedChange={(checked) => set('sharePhone', checked === true)}
        />
        <Label htmlFor="enquiry-share-phone" className="leading-snug font-normal">
          Share my verified phone number with {businessName} so they can call me.
        </Label>
      </div>

      <p role="alert" className="text-caption text-destructive empty:hidden">
        {formError}
      </p>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={send.isPending}>
          {send.isPending ? <Loader2 aria-hidden className="animate-spin" /> : <Send aria-hidden />}
          Send enquiry
        </Button>
      </DialogFooter>
    </form>
  );
}
