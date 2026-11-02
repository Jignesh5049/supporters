import {
  ListingStatus,
  ProductAvailability,
  ServiceAvailability,
  createBusinessSchema,
  createProductSchema,
  createServiceSchema,
  updateBusinessSchema,
  type BusinessType,
  type CreateBusinessInput,
  type CreateProductInput,
  type CreateServiceInput,
  type Media,
  type MyBusiness,
  type Product,
  type Service,
  type UpdateBusinessInput,
  type UpdateProductInput,
  type UpdateServiceInput,
} from '@supporters/shared';
import type { z } from 'zod';
import { ApiError } from '../../lib/api/errors';

/** Field name → first message, for showing under each input. */
export type FieldErrors = Record<string, string>;

export type FormResult<T> = { success: true; data: T } | { success: false; errors: FieldErrors };

/** Pickers whose empty value fails a uuid or enum check. */
const CHOICE_MESSAGES: Record<string, string> = {
  categoryId: 'Choose a category',
  cityId: 'Choose a city',
  type: 'Choose a business type',
};

const PRICE_FIELDS = new Set(['price', 'originalPrice']);

/** Zod's built-in messages are written for developers; the schemas' own messages are kept. */
function issueMessage(field: string, issue: z.core.$ZodIssue): string {
  if (PRICE_FIELDS.has(field) && issue.code !== 'custom')
    return 'Enter a price in rupees, like 1250';
  switch (issue.code) {
    case 'invalid_type':
    case 'invalid_value':
      return CHOICE_MESSAGES[field] ?? 'Enter a valid value';
    case 'invalid_format':
      return issue.format === 'uuid'
        ? (CHOICE_MESSAGES[field] ?? 'Choose an option')
        : issue.message;
    case 'too_small':
      if (issue.origin === 'string') {
        return Number(issue.minimum) <= 1 ? 'Required' : `Use at least ${issue.minimum} characters`;
      }
      return `Must be at least ${issue.minimum}`;
    case 'too_big':
      return issue.origin === 'string'
        ? `Use at most ${issue.maximum} characters`
        : `Must be at most ${issue.maximum}`;
    default:
      return issue.message;
  }
}

/** Flattens Zod issues to one message per top-level field. */
export function toFieldErrors(error: z.ZodError): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? 'form');
    errors[field] ??= issueMessage(field, issue);
  }
  return errors;
}

function parseWith<T>(schema: z.ZodType<T>, input: unknown): FormResult<T> {
  const result = schema.safeParse(input);
  return result.success
    ? { success: true, data: result.data }
    : { success: false, errors: toFieldErrors(result.error) };
}

/** `"1,250.50"` → 125050. Empty means no price; anything unparseable is NaN, so Zod rejects it. */
export function rupeesToPaise(value: string): number | undefined {
  const cleaned = value.replace(/[,\s₹]/g, '');
  if (cleaned === '') return undefined;
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return Number.NaN;
  return Math.round(Number(cleaned) * 100);
}

export function paiseToRupees(amountPaise: number | undefined | null): string {
  if (amountPaise === undefined || amountPaise === null) return '';
  return amountPaise % 100 === 0 ? String(amountPaise / 100) : (amountPaise / 100).toFixed(2);
}

const money = (rupees: string) => {
  const amountPaise = rupeesToPaise(rupees);
  return amountPaise === undefined ? undefined : { amountPaise, currency: 'INR' as const };
};

const optionalText = (value: string) => (value.trim() === '' ? undefined : value.trim());

const optionalInt = (value: string) => (value.trim() === '' ? undefined : Number(value));

// Products

export interface ProductFormValues {
  title: string;
  description: string;
  categoryId: string;
  price: string;
  originalPrice: string;
  unit: string;
  moq: string;
  deliveryTime: string;
  availability: Product['availability'];
  images: Media[];
  status: ListingStatus;
}

export const emptyProductForm: ProductFormValues = {
  title: '',
  description: '',
  categoryId: '',
  price: '',
  originalPrice: '',
  unit: '',
  moq: '',
  deliveryTime: '',
  availability: ProductAvailability.InStock,
  images: [],
  status: ListingStatus.Draft,
};

export function productToForm(product: Product): ProductFormValues {
  return {
    title: product.title,
    description: product.description,
    categoryId: product.category.id,
    price: paiseToRupees(product.price?.amountPaise),
    originalPrice: paiseToRupees(product.originalPrice?.amountPaise),
    unit: product.unit ?? '',
    moq: product.moq === null ? '' : String(product.moq),
    deliveryTime: product.deliveryTime ?? '',
    availability: product.availability,
    images: product.images,
    status: product.status,
  };
}

/**
 * Validates the form with the API's own schema. The result is sent as is for a create, and
 * also works for an update, since every create field is a valid update field.
 */
export function toProductInput(values: ProductFormValues): FormResult<CreateProductInput> {
  return parseWith(createProductSchema, {
    title: values.title,
    description: values.description,
    categoryId: values.categoryId,
    price: money(values.price),
    originalPrice: money(values.originalPrice),
    unit: optionalText(values.unit),
    moq: optionalInt(values.moq),
    deliveryTime: optionalText(values.deliveryTime),
    availability: values.availability,
    mediaIds: values.images.map((image) => image.id),
    status: values.status,
  });
}

// Services

export interface ServiceFormValues {
  title: string;
  description: string;
  categoryId: string;
  price: string;
  priceUnit: string;
  turnaround: string;
  availability: Service['availability'];
  features: string;
  images: Media[];
  status: ListingStatus;
}

export const emptyServiceForm: ServiceFormValues = {
  title: '',
  description: '',
  categoryId: '',
  price: '',
  priceUnit: '',
  turnaround: '',
  availability: ServiceAvailability.ByAppointment,
  features: '',
  images: [],
  status: ListingStatus.Draft,
};

export function serviceToForm(service: Service): ServiceFormValues {
  return {
    title: service.title,
    description: service.description,
    categoryId: service.category.id,
    price: paiseToRupees(service.price?.amountPaise),
    priceUnit: service.priceUnit ?? '',
    turnaround: service.turnaround ?? '',
    availability: service.availability,
    features: service.features.join('\n'),
    images: service.images,
    status: service.status,
  };
}

export function toServiceInput(values: ServiceFormValues): FormResult<CreateServiceInput> {
  return parseWith(createServiceSchema, {
    title: values.title,
    description: values.description,
    categoryId: values.categoryId,
    price: money(values.price),
    priceUnit: optionalText(values.priceUnit),
    turnaround: optionalText(values.turnaround),
    availability: values.availability,
    // One feature per line.
    features: values.features
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    mediaIds: values.images.map((image) => image.id),
    status: values.status,
  });
}

// Business

export interface BusinessFormValues {
  name: string;
  type: BusinessType | '';
  categoryId: string;
  stateCode: string;
  cityId: string;
  about: string;
  contactPhone: string;
  contactEmail: string;
  website: string;
  address: string;
  pincode: string;
  isContactPublic: boolean;
  logo: Media | null;
  cover: Media | null;
}

export const emptyBusinessForm: BusinessFormValues = {
  name: '',
  type: '',
  categoryId: '',
  stateCode: '',
  cityId: '',
  about: '',
  contactPhone: '',
  contactEmail: '',
  website: '',
  address: '',
  pincode: '',
  isContactPublic: true,
  logo: null,
  cover: null,
};

export function businessToForm(business: MyBusiness): BusinessFormValues {
  return {
    name: business.name,
    type: business.type,
    categoryId: business.category.id,
    stateCode: business.state.code,
    cityId: business.city.id,
    about: business.about ?? '',
    contactPhone: business.contactPhone ?? '',
    contactEmail: business.contactEmail ?? '',
    website: business.website ?? '',
    address: business.address ?? '',
    pincode: business.pincode ?? '',
    isContactPublic: business.isContactPublic,
    logo: business.logo,
    cover: business.cover,
  };
}

/** `9876543210` or `+91 98765 43210` → `+919876543210`. */
export function toBusinessPhone(value: string): string | undefined {
  const digits = value.replace(/\D/g, '');
  if (digits === '') return undefined;
  return digits.length === 12 && digits.startsWith('91') ? `+${digits}` : `+91${digits}`;
}

/** Onboarding (`POST /me/business`): empty optional fields are left out. */
export function toCreateBusinessInput(values: BusinessFormValues): FormResult<CreateBusinessInput> {
  return parseWith(createBusinessSchema, {
    name: values.name,
    type: values.type || undefined,
    categoryId: values.categoryId,
    cityId: values.cityId,
    about: optionalText(values.about),
    contactPhone: toBusinessPhone(values.contactPhone),
    contactEmail: optionalText(values.contactEmail),
    website: optionalText(values.website),
    address: optionalText(values.address),
    pincode: optionalText(values.pincode),
    isContactPublic: values.isContactPublic,
    logoMediaId: values.logo?.id,
    coverMediaId: values.cover?.id,
  });
}

/** Editing (`PATCH /me/business`): an emptied optional field is cleared with `null`. */
export function toUpdateBusinessInput(values: BusinessFormValues): FormResult<UpdateBusinessInput> {
  const clearable = (value: string | undefined) => value ?? null;
  return parseWith(updateBusinessSchema, {
    name: values.name,
    type: values.type || undefined,
    categoryId: values.categoryId,
    cityId: values.cityId,
    about: clearable(optionalText(values.about)),
    contactPhone: clearable(toBusinessPhone(values.contactPhone)),
    contactEmail: clearable(optionalText(values.contactEmail)),
    website: clearable(optionalText(values.website)),
    address: clearable(optionalText(values.address)),
    pincode: clearable(optionalText(values.pincode)),
    isContactPublic: values.isContactPublic,
    logoMediaId: values.logo?.id ?? null,
    coverMediaId: values.cover?.id ?? null,
  });
}

/**
 * Fields the API rejected (`body.title`), marked for the form. The server's own wording is not
 * shown (mobile spec, Data layer), so each gets a generic message.
 */
export function apiFieldErrors(error: unknown): FieldErrors {
  if (!(error instanceof ApiError)) return {};
  const errors: FieldErrors = {};
  for (const fieldError of error.fieldErrors) {
    const field = fieldError.path.replace(/^body\./, '').split('.')[0];
    if (field) errors[field] ??= 'Check this field';
  }
  return errors;
}

/** For a PATCH, an optional field the owner emptied is sent as `null` so the API clears it. */
export function toProductUpdate(input: CreateProductInput): UpdateProductInput {
  return {
    ...input,
    price: input.price ?? null,
    originalPrice: input.originalPrice ?? null,
    unit: input.unit ?? null,
    moq: input.moq ?? null,
    deliveryTime: input.deliveryTime ?? null,
  };
}

export function toServiceUpdate(input: CreateServiceInput): UpdateServiceInput {
  return {
    ...input,
    price: input.price ?? null,
    priceUnit: input.priceUnit ?? null,
    turnaround: input.turnaround ?? null,
  };
}
