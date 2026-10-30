import { z } from 'zod';
import { LISTING_LIMITS, TEXT_LIMITS } from '../limits';
import { businessSummarySchema } from './business';
import { categoryRefSchema } from './categories';
import { moneyInputSchema, moneySchema, paginationQuerySchema } from './common';
import { citySchema, stateSchema } from './places';

/** Only published listings are public and indexed (product spec, Listings). */
export const ListingStatus = {
  Draft: 'draft',
  Published: 'published',
  Archived: 'archived',
} as const;
export type ListingStatus = (typeof ListingStatus)[keyof typeof ListingStatus];
export const listingStatusSchema = z.enum(Object.values(ListingStatus));

export const ProductAvailability = {
  InStock: 'in_stock',
  MadeToOrder: 'made_to_order',
  Bulk: 'bulk',
} as const;
export const productAvailabilitySchema = z.enum(Object.values(ProductAvailability));

export const ServiceAvailability = {
  Immediate: 'immediate',
  Within24Hours: 'within_24_hours',
  ByAppointment: 'by_appointment',
} as const;
export const serviceAvailabilitySchema = z.enum(Object.values(ServiceAvailability));

/** Units for price and MOQ. Stored as text, so adding one needs no migration. */
export const PRODUCT_UNITS = [
  'piece',
  'pair',
  'set',
  'dozen',
  'pack',
  'box',
  'carton',
  'bag',
  'bottle',
  'roll',
  'kg',
  'gram',
  'quintal',
  'tonne',
  'litre',
  'ml',
  'metre',
  'foot',
  'sq_metre',
  'sq_foot',
] as const;
export const productUnitSchema = z.enum(PRODUCT_UNITS);

export const SERVICE_PRICE_UNITS = ['per_hour', 'per_day', 'per_job', 'per_month'] as const;
export const servicePriceUnitSchema = z.enum(SERVICE_PRICE_UNITS);

/** All India, or a list of states (and, for services, cities). */
const areaInputSchema = (allowCities: boolean) =>
  z
    .strictObject({
      allIndia: z.boolean(),
      stateIds: z.array(z.uuid()).max(LISTING_LIMITS.areaStatesMax).default([]),
      cityIds: (allowCities
        ? z.array(z.uuid()).max(LISTING_LIMITS.areaCitiesMax)
        : z.array(z.uuid()).max(0, 'Products ship to states, not cities')
      ).default([]),
    })
    .refine((area) => !area.allIndia || (area.stateIds.length === 0 && area.cityIds.length === 0), {
      message: 'Leave states and cities empty for All India',
    })
    .transform((area) => ({
      allIndia: area.allIndia,
      stateIds: [...new Set(area.stateIds)],
      cityIds: [...new Set(area.cityIds)],
    }));

export const areaSchema = z.object({
  allIndia: z.boolean(),
  states: z.array(stateSchema),
  cities: z.array(citySchema),
});
export type Area = z.infer<typeof areaSchema>;

const specsSchema = z
  .array(
    z.strictObject({
      key: z.string().trim().min(1).max(LISTING_LIMITS.specKey.max),
      value: z.string().trim().min(1).max(LISTING_LIMITS.specValue.max),
    }),
  )
  .max(LISTING_LIMITS.specsMaxKeys)
  .refine((specs) => new Set(specs.map((spec) => spec.key.toLowerCase())).size === specs.length, {
    message: 'Each specification key must be unique',
  });

const featuresSchema = z
  .array(z.string().trim().min(1).max(LISTING_LIMITS.serviceFeature.max))
  .max(LISTING_LIMITS.serviceFeaturesMax);

const leadTimeSchema = z.string().trim().min(1).max(LISTING_LIMITS.leadTime.max);

const listingCoreFields = {
  title: z.string().trim().min(1).max(TEXT_LIMITS.listingTitle.max),
  categoryId: z.uuid(),
  description: z.string().trim().min(1).max(TEXT_LIMITS.listingDescription.max),
};

const priceAboveOriginal = (input: {
  price?: { amountPaise: number } | null | undefined;
  originalPrice?: { amountPaise: number } | null | undefined;
}) =>
  !input.price || !input.originalPrice || input.originalPrice.amountPaise > input.price.amountPaise;
const priceOrderIssue = {
  message: 'The original price must be above the price',
  path: ['originalPrice'],
};

/** No price means "Ask for price". Owners create drafts or publish directly. */
export const createProductSchema = z
  .strictObject({
    ...listingCoreFields,
    price: moneyInputSchema.optional(),
    /** The strike-through price; must be above `price`. */
    originalPrice: moneyInputSchema.optional(),
    unit: productUnitSchema.optional(),
    moq: z.number().int().min(1).max(LISTING_LIMITS.maxMoq).optional(),
    deliveryTime: leadTimeSchema.optional(),
    availability: productAvailabilitySchema.default(ProductAvailability.InStock),
    shippingArea: areaInputSchema(false).default({ allIndia: true, stateIds: [], cityIds: [] }),
    specs: specsSchema.default([]),
    status: listingStatusSchema.default(ListingStatus.Draft),
  })
  .refine(priceAboveOriginal, priceOrderIssue);
export type CreateProductInput = z.infer<typeof createProductSchema>;

/** Every field optional; `null` clears an optional one. */
export const updateProductSchema = z
  .strictObject({
    title: listingCoreFields.title.optional(),
    categoryId: listingCoreFields.categoryId.optional(),
    description: listingCoreFields.description.optional(),
    price: moneyInputSchema.nullable().optional(),
    originalPrice: moneyInputSchema.nullable().optional(),
    unit: productUnitSchema.nullable().optional(),
    moq: z.number().int().min(1).max(LISTING_LIMITS.maxMoq).nullable().optional(),
    deliveryTime: leadTimeSchema.nullable().optional(),
    availability: productAvailabilitySchema.optional(),
    shippingArea: areaInputSchema(false).optional(),
    specs: specsSchema.optional(),
    status: listingStatusSchema.optional(),
  })
  .refine(priceAboveOriginal, priceOrderIssue);
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const createServiceSchema = z.strictObject({
  ...listingCoreFields,
  /** A starting price. */
  price: moneyInputSchema.optional(),
  priceUnit: servicePriceUnitSchema.optional(),
  turnaround: leadTimeSchema.optional(),
  availability: serviceAvailabilitySchema.default(ServiceAvailability.ByAppointment),
  serviceArea: areaInputSchema(true).default({ allIndia: true, stateIds: [], cityIds: [] }),
  features: featuresSchema.default([]),
  status: listingStatusSchema.default(ListingStatus.Draft),
});
export type CreateServiceInput = z.infer<typeof createServiceSchema>;

export const updateServiceSchema = z.strictObject({
  title: listingCoreFields.title.optional(),
  categoryId: listingCoreFields.categoryId.optional(),
  description: listingCoreFields.description.optional(),
  price: moneyInputSchema.nullable().optional(),
  priceUnit: servicePriceUnitSchema.nullable().optional(),
  turnaround: leadTimeSchema.nullable().optional(),
  availability: serviceAvailabilitySchema.optional(),
  serviceArea: areaInputSchema(true).optional(),
  features: featuresSchema.optional(),
  status: listingStatusSchema.optional(),
});
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;

const listingBaseSchema = z.object({
  id: z.uuid(),
  business: businessSummarySchema,
  title: z.string(),
  category: categoryRefSchema,
  description: z.string(),
  /** Null means "Ask for price". */
  price: moneySchema.nullable(),
  status: listingStatusSchema,
  publishedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const productSchema = listingBaseSchema.extend({
  originalPrice: moneySchema.nullable(),
  unit: productUnitSchema.nullable(),
  moq: z.number().int().nullable(),
  availability: productAvailabilitySchema,
  deliveryTime: z.string().nullable(),
  shippingArea: areaSchema,
  specs: z.array(z.object({ key: z.string(), value: z.string() })),
});
export type Product = z.infer<typeof productSchema>;

export const serviceSchema = listingBaseSchema.extend({
  priceUnit: servicePriceUnitSchema.nullable(),
  turnaround: z.string().nullable(),
  availability: serviceAvailabilitySchema,
  serviceArea: areaSchema,
  features: z.array(z.string()),
});
export type Service = z.infer<typeof serviceSchema>;

export const listingIdParamsSchema = z.strictObject({ id: z.uuid() });

export const myListingsQuerySchema = paginationQuerySchema.extend({
  status: listingStatusSchema.optional(),
});
export type MyListingsQuery = z.infer<typeof myListingsQuerySchema>;
