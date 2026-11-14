import {
  type CreateQuoteInput,
  type CreateRequirementInput,
  RATE_LIMITS,
  type Requirement,
  type RequirementStatus,
  createQuoteSchema,
  createRequirementSchema,
} from '@supporters/shared';
import { waitText } from '@/features/messaging/enquiry-form-values';
import { ApiError, errorMessage, formFieldErrors } from '@/lib/api/errors';
import { formatMoney, rupeesToPaise, truncate, unitLabel } from '@/lib/catalog/format';

// Pure helpers for the requirement and quote forms and cards, tested without React.

export const REQUIREMENT_STATUS_LABELS: Record<RequirementStatus, string> = {
  open: 'Open',
  closed: 'Closed',
  fulfilled: 'Fulfilled',
  expired: 'Expired',
};

/** The first line of the description, as the card's heading. */
export function requirementTitle(requirement: Pick<Requirement, 'description'>): string {
  const firstLine = requirement.description.split('\n')[0]?.trim() ?? '';
  return truncate(firstLine, 90);
}

export const requirementQuantity = (requirement: Pick<Requirement, 'quantity' | 'unit'>) =>
  `${new Intl.NumberFormat('en-IN').format(requirement.quantity)} ${unitLabel(requirement.unit)}`;

export const requirementBudget = (requirement: Pick<Requirement, 'budget'>) =>
  requirement.budget ? formatMoney(requirement.budget) : 'Open to quotes';

/** `3 days left`, `Expires today`, or the status when it is no longer open. */
export function requirementTimeLeft(
  requirement: Pick<Requirement, 'status' | 'expiresAt'>,
  now: Date = new Date(),
): string {
  if (requirement.status !== 'open') return REQUIREMENT_STATUS_LABELS[requirement.status];
  const left = Date.parse(requirement.expiresAt) - now.getTime();
  if (left < 86_400_000) return 'Expires today';
  const days = Math.ceil(left / 86_400_000);
  return `${days} ${days === 1 ? 'day' : 'days'} left`;
}

// The post form.

export interface RequirementFormValues {
  description: string;
  categoryId: string;
  quantity: string;
  unit: string;
  deliveryCityId: string;
  budget: string;
  imageIds: string[];
}

export type RequirementField = Exclude<keyof RequirementFormValues, 'imageIds'> | 'imageIds';
export type RequirementErrors = Partial<Record<RequirementField, string>>;

export const emptyRequirement = (): RequirementFormValues => ({
  description: '',
  categoryId: '',
  quantity: '',
  unit: '',
  deliveryCityId: '',
  budget: '',
  imageIds: [],
});

const REQUIREMENT_MESSAGES: Partial<Record<RequirementField, string>> = {
  description: 'Describe what you need in 20 to 1,000 characters.',
  categoryId: 'Choose a category.',
  quantity: 'Enter a whole number of at least 1.',
  unit: 'Choose a unit.',
  deliveryCityId: 'Choose the delivery city.',
  budget: 'Enter an amount in rupees, like 25,000.',
};

const requirementFieldOf = (path: PropertyKey | undefined): RequirementField | null =>
  typeof path === 'string' && path in REQUIREMENT_MESSAGES
    ? (path as RequirementField)
    : path === 'imageIds'
      ? 'imageIds'
      : null;

/** Builds the `POST /v1/buyer-requirements` body and checks it with the shared schema. */
export function toRequirementBody(
  values: RequirementFormValues,
): { ok: true; body: CreateRequirementInput } | { ok: false; errors: RequirementErrors } {
  const quantity = values.quantity.trim();
  const budget = values.budget.trim();
  const budgetPaise = budget ? rupeesToPaise(budget) : null;
  const draft = {
    description: values.description,
    categoryId: values.categoryId,
    quantity: /^\d+$/.test(quantity) ? Number(quantity) : Number.NaN,
    unit: values.unit,
    deliveryCityId: values.deliveryCityId,
    ...(budget ? { budget: { amountPaise: budgetPaise ?? Number.NaN } } : {}),
    imageIds: values.imageIds,
  };
  const parsed = createRequirementSchema.safeParse(draft);
  if (parsed.success) return { ok: true, body: parsed.data };
  const errors: RequirementErrors = {};
  for (const issue of parsed.error.issues) {
    const field = requirementFieldOf(issue.path[0]);
    if (field && !errors[field]) errors[field] = REQUIREMENT_MESSAGES[field] ?? issue.message;
  }
  if (Object.keys(errors).length === 0) errors.description = 'Check the details and try again.';
  return { ok: false, errors };
}

/** What went wrong with a post, in words, plus API field errors mapped to the form. */
export function requirementError(error: unknown): { message: string; fields: RequirementErrors } {
  const fields: RequirementErrors = {};
  for (const { name, message } of formFieldErrors(error)) {
    const field = requirementFieldOf(name);
    if (field) fields[field] = message;
  }
  if (error instanceof ApiError) {
    if (error.code === 'RATE_LIMITED') {
      return {
        message: `You can post ${RATE_LIMITS.requirementsPerDay} requirements a day. Try again in ${waitText(error.retryAfter)}.`,
        fields,
      };
    }
    if (error.code === 'REQUIREMENT_LIMIT_REACHED') {
      return {
        message: `You already have ${RATE_LIMITS.openRequirements} open requirements. Close or fulfil one to post another.`,
        fields,
      };
    }
  }
  return { message: errorMessage(error), fields };
}

// The quote form.

export interface QuoteFormValues {
  price: string;
  message: string;
  /** `product:<id>`, `service:<id>` or empty. */
  listing: string;
}

export type QuoteField = keyof QuoteFormValues;
export type QuoteErrors = Partial<Record<QuoteField, string>>;

export const emptyQuote = (): QuoteFormValues => ({ price: '', message: '', listing: '' });

const QUOTE_MESSAGES: Record<QuoteField, string> = {
  price: 'Enter your price in rupees, like 1,25,000.',
  message: 'Write between 10 and 1,000 characters.',
  listing: 'Choose one of your published listings, or none.',
};

export function toQuoteBody(
  values: QuoteFormValues,
): { ok: true; body: CreateQuoteInput } | { ok: false; errors: QuoteErrors } {
  const [type, id] = values.listing.split(':');
  const draft = {
    price: { amountPaise: rupeesToPaise(values.price) ?? Number.NaN },
    message: values.message,
    ...(type && id ? { listing: { type, id } } : {}),
  };
  const parsed = createQuoteSchema.safeParse(draft);
  if (parsed.success) return { ok: true, body: parsed.data };
  const errors: QuoteErrors = {};
  for (const issue of parsed.error.issues) {
    const head = issue.path[0];
    const field: QuoteField | null =
      head === 'price' || head === 'message' || head === 'listing' ? head : null;
    if (field && !errors[field]) errors[field] = QUOTE_MESSAGES[field];
  }
  if (Object.keys(errors).length === 0) errors.message = 'Check the details and try again.';
  return { ok: false, errors };
}

/** A refused quote, in words. */
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
        return `Your business can send ${RATE_LIMITS.quotesPerBusinessPerDay} quotes a day. Try again in ${waitText(error.retryAfter)}.`;
      case 'NOT_FOUND':
        return 'This requirement is no longer available.';
      default:
        break;
    }
  }
  return errorMessage(error);
}
