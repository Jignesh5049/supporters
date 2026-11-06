import {
  type CreateEnquiryInput,
  ENQUIRY_LIMITS,
  type ListingRef,
  RATE_LIMITS,
  createEnquirySchema,
} from '@supporters/shared';
import { ApiError, errorMessage, formFieldErrors } from '@/lib/api/errors';

/** The Contact Supplier form as typed (strings from inputs). */
export interface EnquiryFormValues {
  /** `product:<id>` or `service:<id>`. */
  listing: string;
  quantity: string;
  unit: string;
  deliveryCityId: string;
  message: string;
  sharePhone: boolean;
}

export type EnquiryField = 'listing' | 'quantity' | 'unit' | 'deliveryCityId' | 'message';
export type EnquiryErrors = Partial<Record<EnquiryField, string>>;

export const listingValue = (listing: ListingRef) => `${listing.type}:${listing.id}`;

export function emptyEnquiry(listing?: ListingRef): EnquiryFormValues {
  return {
    listing: listing ? listingValue(listing) : '',
    quantity: '',
    unit: '',
    deliveryCityId: '',
    message: '',
    sharePhone: false,
  };
}

/** Schema paths to form fields: the listing is one field here, two ids in the API. */
function fieldOf(path: PropertyKey | undefined): EnquiryField | null {
  if (path === 'productId' || path === 'serviceId') return 'listing';
  if (path === 'quantity' || path === 'unit' || path === 'deliveryCityId' || path === 'message') {
    return path;
  }
  return null;
}

const MESSAGES: Partial<Record<EnquiryField, string>> = {
  listing: 'Choose the product or service you are asking about.',
  quantity: 'Enter a whole number of at least 1.',
  message: 'Write between 20 and 1,000 characters.',
};

/**
 * Builds the `POST /v1/enquiries` body and checks it with the shared
 * `createEnquirySchema`; the API checks it again.
 */
export function toEnquiryBody(
  values: EnquiryFormValues,
): { ok: true; body: CreateEnquiryInput } | { ok: false; errors: EnquiryErrors } {
  const [type, id] = values.listing.split(':');
  const quantity = values.quantity.trim();
  const draft = {
    ...(type === 'product' ? { productId: id } : {}),
    ...(type === 'service' ? { serviceId: id } : {}),
    ...(quantity ? { quantity: /^\d+$/.test(quantity) ? Number(quantity) : Number.NaN } : {}),
    ...(values.unit ? { unit: values.unit } : {}),
    ...(values.deliveryCityId ? { deliveryCityId: values.deliveryCityId } : {}),
    message: values.message,
    sharePhone: values.sharePhone,
  };
  const parsed = createEnquirySchema.safeParse(draft);
  if (parsed.success) return { ok: true, body: parsed.data };
  const errors: EnquiryErrors = {};
  // The shared schema only checks the listing once the other fields pass.
  if (!('productId' in draft) && !('serviceId' in draft)) errors.listing = MESSAGES.listing;
  for (const issue of parsed.error.issues) {
    const field = fieldOf(issue.path[0]);
    if (field && !errors[field]) errors[field] = MESSAGES[field] ?? issue.message;
  }
  if (Object.keys(errors).length === 0) errors.message = 'Check the details and try again.';
  return { ok: false, errors };
}

/** `about 3 hours`, `about 20 minutes`, `a moment`. */
export function waitText(seconds: number | undefined): string {
  if (!seconds || seconds < 60) return 'a moment';
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `about ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  const hours = Math.ceil(minutes / 60);
  return `about ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

/** What went wrong with a send, in words, plus API field errors mapped to the form. */
export function enquiryError(error: unknown): { message: string; fields: EnquiryErrors } {
  const fields: EnquiryErrors = {};
  for (const { name, message } of formFieldErrors(error)) {
    const field = fieldOf(name);
    if (field) fields[field] = message;
  }
  if (error instanceof ApiError) {
    if (error.code === 'RATE_LIMITED') {
      const hours = ENQUIRY_LIMITS.perListingWindowSec / 3600;
      return {
        message: `You can send one enquiry per listing every ${hours} hours, and ${RATE_LIMITS.enquiriesPerDay} a day. Try again in ${waitText(error.retryAfter)}.`,
        fields,
      };
    }
    if (error.code === 'BLOCKED') {
      return { message: 'You can’t send enquiries to this business.', fields };
    }
    if (error.code === 'NOT_FOUND') {
      return { message: 'This listing is no longer available.', fields };
    }
    if (error.code === 'REQUEST_IN_PROGRESS') {
      return { message: 'Your enquiry is still being sent. Wait a moment.', fields };
    }
  }
  return { message: errorMessage(error), fields };
}
