import {
  createQuoteSchema,
  createRequirementSchema,
  RATE_LIMITS,
  TEXT_LIMITS,
  type CreateQuoteInput,
  type CreateRequirementInput,
  type ListingRef,
  type Requirement,
  type RequirementStatus,
} from '@supporters/shared';
import { ApiError, messageForError } from '../../lib/api';
import { rupeesToPaise } from '../catalog/listing-form';
import { unitOptionLabel } from '../catalog/labels';
import { formatPrice } from '../social/mappers';

// Pure helpers for the requirement and quote forms and cards, tested without React Native.

export const REQUIREMENT_TEXT = TEXT_LIMITS.requirement;
export const QUOTE_TEXT = TEXT_LIMITS.quoteMessage;

export const REQUIREMENT_STATUS_LABEL: Record<RequirementStatus, string> = {
  open: 'Open',
  closed: 'Closed',
  fulfilled: 'Fulfilled',
  expired: 'Expired',
};

/** The first line of the description, as the card's heading. */
export function requirementTitle(requirement: Pick<Requirement, 'description'>): string {
  const firstLine = requirement.description.split('\n')[0]?.trim() ?? '';
  return firstLine.length > 90 ? `${firstLine.slice(0, 89)}…` : firstLine;
}

export const requirementQuantity = (requirement: Pick<Requirement, 'quantity' | 'unit'>) =>
  `${requirement.quantity.toLocaleString('en-IN')} ${unitOptionLabel(requirement.unit).toLowerCase()}`;

export const requirementBudget = (requirement: Pick<Requirement, 'budget'>) =>
  requirement.budget ? formatPrice(requirement.budget) : 'Open to quotes';

/** `3 days left`, `Expires today`, or the final status. */
export function requirementTimeLeft(
  requirement: Pick<Requirement, 'status' | 'expiresAt'>,
  now: Date = new Date(),
): string {
  if (requirement.status !== 'open') return REQUIREMENT_STATUS_LABEL[requirement.status];
  const left = Date.parse(requirement.expiresAt) - now.getTime();
  if (left < 86_400_000) return 'Expires today';
  const days = Math.ceil(left / 86_400_000);
  return `${days} ${days === 1 ? 'day' : 'days'} left`;
}

// The post form.

export interface RequirementFormValues {
  description: string;
  categoryId: string | null;
  /** Digits only. */
  quantity: string;
  unit: string | null;
  deliveryCityId: string | null;
  /** Rupees as typed; empty means no budget. */
  budget: string;
}

export type RequirementField = keyof RequirementFormValues;

export const emptyRequirementForm = (): RequirementFormValues => ({
  description: '',
  categoryId: null,
  quantity: '',
  unit: null,
  deliveryCityId: null,
  budget: '',
});

const REQUIREMENT_MESSAGES: Record<RequirementField, string> = {
  description: `Describe what you need in ${REQUIREMENT_TEXT.min} to ${REQUIREMENT_TEXT.max.toLocaleString('en-IN')} characters.`,
  categoryId: 'Choose a category.',
  quantity: 'Enter a whole number of at least 1.',
  unit: 'Choose a unit.',
  deliveryCityId: 'Choose the delivery city.',
  budget: 'Enter an amount in rupees, like 25,000.',
};

/** Builds the POST /buyer-requirements body and checks it with the shared schema. */
export function toRequirementInput(
  values: RequirementFormValues,
  imageIds: string[],
):
  | { ok: true; input: CreateRequirementInput }
  | { ok: false; errors: Partial<Record<RequirementField, string>> } {
  const quantity = values.quantity.trim();
  const budget = values.budget.trim() ? rupeesToPaise(values.budget) : null;
  const draft = {
    description: values.description,
    categoryId: values.categoryId ?? '',
    quantity: /^\d+$/.test(quantity) ? Number(quantity) : Number.NaN,
    unit: values.unit ?? '',
    deliveryCityId: values.deliveryCityId ?? '',
    ...(budget !== null ? { budget: { amountPaise: budget } } : {}),
    imageIds,
  };
  const parsed = createRequirementSchema.safeParse(draft);
  if (parsed.success) return { ok: true, input: parsed.data };
  const errors: Partial<Record<RequirementField, string>> = {};
  for (const issue of parsed.error.issues) {
    const head = issue.path[0];
    if (typeof head === 'string' && head in REQUIREMENT_MESSAGES) {
      const field = head as RequirementField;
      errors[field] ??= REQUIREMENT_MESSAGES[field];
    }
  }
  if (Object.keys(errors).length === 0) errors.description = 'Check the details and try again.';
  return { ok: false, errors };
}

const waitText = (seconds: number | undefined) => {
  if (!seconds || seconds < 3600) return 'a little while';
  const hours = Math.ceil(seconds / 3600);
  return `about ${hours} ${hours === 1 ? 'hour' : 'hours'}`;
};

export function requirementErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === 'RATE_LIMITED') {
      return `You can post ${RATE_LIMITS.requirementsPerDay} requirements a day. Try again in ${waitText(error.retryAfterSec)}.`;
    }
    if (error.code === 'REQUIREMENT_LIMIT_REACHED') {
      return `You already have ${RATE_LIMITS.openRequirements} open requirements. Close or fulfil one to post another.`;
    }
  }
  return messageForError(error);
}

// The quote form.

export interface QuoteFormValues {
  price: string;
  message: string;
  listing: ListingRef | null;
}

export const emptyQuoteForm = (): QuoteFormValues => ({ price: '', message: '', listing: null });

export function toQuoteInput(
  values: QuoteFormValues,
):
  | { ok: true; input: CreateQuoteInput }
  | { ok: false; errors: Partial<Record<'price' | 'message', string>> } {
  const draft = {
    price: { amountPaise: rupeesToPaise(values.price) ?? Number.NaN },
    message: values.message,
    ...(values.listing ? { listing: values.listing } : {}),
  };
  const parsed = createQuoteSchema.safeParse(draft);
  if (parsed.success) return { ok: true, input: parsed.data };
  const errors: Partial<Record<'price' | 'message', string>> = {};
  for (const issue of parsed.error.issues) {
    if (issue.path[0] === 'price') errors.price = 'Enter your price in rupees, like 1,25,000.';
    if (issue.path[0] === 'message') {
      errors.message = `Write between ${QUOTE_TEXT.min} and ${QUOTE_TEXT.max.toLocaleString('en-IN')} characters.`;
    }
  }
  if (Object.keys(errors).length === 0) errors.message = 'Check the details and try again.';
  return { ok: false, errors };
}

export function quoteErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'BUSINESS_NOT_VERIFIED':
        return 'Only verified businesses can quote. Get verified from the Business Hub.';
      case 'BUSINESS_REQUIRED':
        return 'Create your business page to send quotes.';
      case 'QUOTE_EXISTS':
        return 'Your business has already quoted on this requirement.';
      case 'REQUIREMENT_NOT_OPEN':
        return 'This requirement is no longer open.';
      case 'BLOCKED':
        return 'You can’t quote on this requirement.';
      case 'RATE_LIMITED':
        return `Your business can send ${RATE_LIMITS.quotesPerBusinessPerDay} quotes a day. Try again in ${waitText(error.retryAfterSec)}.`;
      case 'NOT_FOUND':
        return 'This requirement is no longer available.';
      default:
        break;
    }
  }
  return messageForError(error);
}
