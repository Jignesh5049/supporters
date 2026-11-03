import {
  type Media,
  type Product,
  type Service,
  createProductSchema,
  createServiceSchema,
  updateProductSchema,
  updateServiceSchema,
} from '@supporters/shared';
import { z } from 'zod';
import { paiseToRupees, rupeesToPaise } from '@/lib/catalog/format';

/**
 * Product and service forms. As with the business form, the values are
 * strings and the field names mirror the API body, so every rule (lengths,
 * limits, price order, image count) comes from the shared listing schemas.
 */

type Mode = 'create' | 'update';

const commonShape = {
  title: z.string(),
  categoryId: z.string(),
  description: z.string(),
  /** Rupees as typed; blank means "Ask for price". */
  price: z.string(),
  availability: z.string(),
  /** Uploaded images in display order; the body sends their ids. */
  images: z.array(z.object({ id: z.string(), url: z.string() })),
  /** All India, or the chosen states. */
  allIndia: z.boolean(),
  stateIds: z.array(z.string()),
  status: z.enum(['draft', 'published', 'archived']),
};

const productValuesSchema = z.object({
  ...commonShape,
  originalPrice: z.string(),
  unit: z.string(),
  moq: z.string(),
  deliveryTime: z.string(),
  specs: z.array(z.object({ key: z.string(), value: z.string() })),
});
export type ProductFormValues = z.infer<typeof productValuesSchema>;

const serviceValuesSchema = z.object({
  ...commonShape,
  priceUnit: z.string(),
  turnaround: z.string(),
  /** One feature per line. */
  features: z.string(),
});
export type ServiceFormValues = z.infer<typeof serviceValuesSchema>;

const COMMON_EMPTY = {
  title: '',
  categoryId: '',
  description: '',
  price: '',
  images: [] as Media[],
  allIndia: true,
  stateIds: [] as string[],
  status: 'draft' as const,
};

export const EMPTY_PRODUCT_FORM: ProductFormValues = {
  ...COMMON_EMPTY,
  availability: 'in_stock',
  originalPrice: '',
  unit: '',
  moq: '',
  deliveryTime: '',
  specs: [],
};

export const EMPTY_SERVICE_FORM: ServiceFormValues = {
  ...COMMON_EMPTY,
  availability: 'by_appointment',
  priceUnit: '',
  turnaround: '',
  features: '',
};

/**
 * Rupees to the API's money object. Text that isn't a price is passed on as
 * NaN paise so the shared schema reports it on `price.amountPaise`.
 */
function toMoney(value: string): { amountPaise: number; currency: 'INR' } {
  return { amountPaise: rupeesToPaise(value) ?? Number.NaN, currency: 'INR' };
}

function optional<T>(value: string, mode: Mode, map: (text: string) => T): T | null | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return mode === 'create' ? undefined : null;
  return map(trimmed);
}

/** Whole numbers stay numbers; anything else stays text for the schema to reject. */
function toInteger(value: string): number | string {
  return /^\d+$/.test(value) ? Number(value) : value;
}

function commonBody(values: ProductFormValues | ServiceFormValues, mode: Mode) {
  return {
    title: values.title.trim(),
    categoryId: values.categoryId,
    description: values.description.trim(),
    price: optional(values.price, mode, toMoney),
    availability: values.availability,
    mediaIds: values.images.map((image) => image.id),
    status: values.status,
  };
}

const area = (values: { allIndia: boolean; stateIds: string[] }) => ({
  allIndia: values.allIndia,
  stateIds: values.allIndia ? [] : values.stateIds,
  cityIds: [],
});

const withoutUndefined = (body: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));

export function toProductBody(values: ProductFormValues, mode: Mode): Record<string, unknown> {
  return withoutUndefined({
    ...commonBody(values, mode),
    originalPrice: optional(values.originalPrice, mode, toMoney),
    unit: optional(values.unit, mode, (unit) => unit),
    moq: optional(values.moq, mode, toInteger),
    deliveryTime: optional(values.deliveryTime, mode, (text) => text),
    shippingArea: area(values),
    // Empty rows are ignored rather than reported.
    specs: values.specs
      .map((spec) => ({ key: spec.key.trim(), value: spec.value.trim() }))
      .filter((spec) => spec.key !== '' || spec.value !== ''),
  });
}

export function toServiceBody(values: ServiceFormValues, mode: Mode): Record<string, unknown> {
  return withoutUndefined({
    ...commonBody(values, mode),
    priceUnit: optional(values.priceUnit, mode, (unit) => unit),
    turnaround: optional(values.turnaround, mode, (text) => text),
    serviceArea: area(values),
    features: values.features
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  });
}

const asProduct = (values: z.infer<typeof productValuesSchema>) => values as ProductFormValues;
const asService = (values: z.infer<typeof serviceValuesSchema>) => values as ServiceFormValues;

export const createProductFormSchema = productValuesSchema
  .transform((values) => toProductBody(asProduct(values), 'create'))
  .pipe(createProductSchema);
export const updateProductFormSchema = productValuesSchema
  .transform((values) => toProductBody(asProduct(values), 'update'))
  .pipe(updateProductSchema);
export const createServiceFormSchema = serviceValuesSchema
  .transform((values) => toServiceBody(asService(values), 'create'))
  .pipe(createServiceSchema);
export const updateServiceFormSchema = serviceValuesSchema
  .transform((values) => toServiceBody(asService(values), 'update'))
  .pipe(updateServiceSchema);

/**
 * API issue paths that differ from the form's: images are `mediaIds` in the
 * body, and areas are nested. Used for both Zod and API field errors.
 */
export function listingErrorField(path: string): string {
  if (path.startsWith('mediaIds')) return 'images';
  if (path.startsWith('shippingArea') || path.startsWith('serviceArea')) return 'stateIds';
  return path;
}

function commonValues(listing: Product | Service) {
  const area = 'shippingArea' in listing ? listing.shippingArea : listing.serviceArea;
  return {
    title: listing.title,
    categoryId: listing.category.id,
    description: listing.description,
    price: listing.price ? paiseToRupees(listing.price.amountPaise) : '',
    availability: listing.availability,
    images: listing.images,
    allIndia: area.allIndia,
    stateIds: area.states.map((state) => state.id),
    status: listing.status,
  };
}

export function productToFormValues(product: Product): ProductFormValues {
  return {
    ...commonValues(product),
    originalPrice: product.originalPrice ? paiseToRupees(product.originalPrice.amountPaise) : '',
    unit: product.unit ?? '',
    moq: product.moq ? String(product.moq) : '',
    deliveryTime: product.deliveryTime ?? '',
    specs: product.specs,
  };
}

export function serviceToFormValues(service: Service): ServiceFormValues {
  return {
    ...commonValues(service),
    priceUnit: service.priceUnit ?? '',
    turnaround: service.turnaround ?? '',
    features: service.features.join('\n'),
  };
}
