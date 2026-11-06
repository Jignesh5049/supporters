import {
  createEnquirySchema,
  ENQUIRY_LIMITS,
  RATE_LIMITS,
  TEXT_LIMITS,
  type ListingRef,
  PRODUCT_UNITS,
} from '@supporters/shared';
import { ApiError, messageForError, type EnquiryDraft } from '../../lib/api';

/** 20 to 1,000 characters (product spec, Enquiries). */
export const ENQUIRY_MESSAGE = TEXT_LIMITS.enquiryMessage;

/** A product unit, as the API takes it. */
export type ProductUnit = (typeof PRODUCT_UNITS)[number];

export interface EnquiryFormValues {
  listing: ListingRef | null;
  /** As typed; digits only. */
  quantity: string;
  unit: ProductUnit | null;
  deliveryCityId: string | null;
  message: string;
  sharePhone: boolean;
}

export type EnquiryField = 'listing' | 'quantity' | 'message';

export const emptyEnquiryForm = (listing: ListingRef | null): EnquiryFormValues => ({
  listing,
  quantity: '',
  unit: null,
  deliveryCityId: null,
  message: '',
  sharePhone: false,
});

const FIELD_FOR_PATH: Record<string, EnquiryField> = {
  productId: 'listing',
  serviceId: 'listing',
  quantity: 'quantity',
  message: 'message',
};

/** Builds the POST /enquiries body and checks it with the shared schema. */
export function toEnquiryDraft(
  values: EnquiryFormValues,
):
  { ok: true; draft: EnquiryDraft } | { ok: false; errors: Partial<Record<EnquiryField, string>> } {
  const errors: Partial<Record<EnquiryField, string>> = {};
  if (!values.listing) errors.listing = 'Choose the product or service you are asking about.';
  const quantityText = values.quantity.trim();
  if (quantityText && !/^\d+$/.test(quantityText)) errors.quantity = 'Enter a whole number.';

  const draft: EnquiryDraft = {
    ...(values.listing?.type === 'product' ? { productId: values.listing.id } : {}),
    ...(values.listing?.type === 'service' ? { serviceId: values.listing.id } : {}),
    ...(quantityText && !errors.quantity ? { quantity: Number(quantityText) } : {}),
    ...(values.unit ? { unit: values.unit } : {}),
    ...(values.deliveryCityId ? { deliveryCityId: values.deliveryCityId } : {}),
    message: values.message,
    sharePhone: values.sharePhone,
  };
  const parsed = createEnquirySchema.safeParse(draft);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = FIELD_FOR_PATH[String(issue.path[0])];
      if (!field || errors[field]) continue;
      errors[field] = fieldMessage(field, issue.code);
    }
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, draft };
}

function fieldMessage(field: EnquiryField, code: string): string {
  if (field === 'message') {
    return `Write ${ENQUIRY_MESSAGE.min} to ${ENQUIRY_MESSAGE.max} characters about what you need.`;
  }
  if (field === 'quantity')
    return code === 'too_big' ? 'That quantity is too large.' : 'Enter 1 or more.';
  return 'Choose the product or service you are asking about.';
}

const hours = (seconds: number) => Math.max(1, Math.ceil(seconds / 3600));

/** What went wrong with a send, in plain words. Never the server's own text. */
export function enquiryErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'RATE_LIMITED') {
      const wait = error.retryAfterSec
        ? ` Try again in about ${hours(error.retryAfterSec)} h.`
        : '';
      return `You can send ${RATE_LIMITS.enquiriesPerDay} enquiries a day, and one per listing every ${ENQUIRY_LIMITS.perListingWindowSec / 3600} hours.${wait}`;
    }
    if (error.code === 'BLOCKED') return "You can't send enquiries to this business.";
    if (error.code === 'NOT_FOUND') return 'This listing is no longer available.';
    if (error.code === 'REQUEST_IN_PROGRESS') return 'Still sending your enquiry. Wait a moment.';
    if (error.code === 'IDEMPOTENCY_KEY_REUSED')
      return 'Something changed. Send the enquiry again.';
  }
  return messageForError(error);
}

/**
 * One Idempotency-Key per enquiry: reused while the body stays the same (a retry after a
 * timeout), replaced when the user changes the form.
 */
export function createKeyRing(makeKey: () => string) {
  let current: { key: string; body: string } | null = null;
  return {
    keyFor(draft: EnquiryDraft): string {
      const body = JSON.stringify(draft);
      if (!current || current.body !== body) current = { key: makeKey(), body };
      return current.key;
    },
    reset() {
      current = null;
    },
  };
}
