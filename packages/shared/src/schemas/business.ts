import { z } from 'zod';
import { BUSINESS_LIMITS, TEXT_LIMITS } from '../limits';
import { emailSchema } from './auth';
import { categoryRefSchema } from './categories';
import { slugPattern, webUrlSchema } from './common';
import { citySchema, stateSchema } from './places';

/** Product spec, "Who it serves". */
export const BusinessType = {
  Manufacturer: 'manufacturer',
  Wholesaler: 'wholesaler',
  Retailer: 'retailer',
  Distributor: 'distributor',
  Brand: 'brand',
  ServiceProvider: 'service_provider',
} as const;
export type BusinessType = (typeof BusinessType)[keyof typeof BusinessType];
export const businessTypeSchema = z.enum(Object.values(BusinessType));

export const VerificationStatus = {
  None: 'none',
  Pending: 'pending',
  Verified: 'verified',
  Rejected: 'rejected',
} as const;
export type VerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus];

const GSTIN_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** The GSTIN check digit: a mod-36 Luhn variant over the first 14 characters. */
export function gstinCheckChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i += 1) {
    const product = GSTIN_CHARS.indexOf(first14.charAt(i)) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return GSTIN_CHARS.charAt((36 - (sum % 36)) % 36);
}

/** 15 characters: state code, PAN, entity number, `Z`, check character. */
export const gstinSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(
    z
      .string()
      .regex(/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/, 'Enter a valid GSTIN')
      .refine((value) => gstinCheckChar(value.slice(0, 14)) === value.charAt(14), {
        message: 'Enter a valid GSTIN',
      }),
  );

/** Business contact numbers: +91 mobiles and landlines (10 digits after +91). */
export const businessPhoneSchema = z.string().regex(/^\+91[1-9]\d{9}$/, 'Enter a +91 number');

export const businessSlugSchema = z
  .string()
  .min(BUSINESS_LIMITS.slug.min)
  .max(BUSINESS_LIMITS.slug.max)
  .regex(slugPattern, 'Use lower-case letters, digits and single hyphens');

export const DayOfWeek = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const timeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:MM');

/** Days that are not listed are closed. Overnight slots are not supported. */
export const openingHoursSchema = z
  .array(
    z
      .strictObject({ day: z.enum(DayOfWeek), opens: timeOfDay, closes: timeOfDay })
      .refine((slot) => slot.opens < slot.closes, {
        message: 'Closing time must be after opening time',
        path: ['closes'],
      }),
  )
  .max(BUSINESS_LIMITS.openingHoursMax);
export type OpeningHours = z.infer<typeof openingHoursSchema>;

const socialUrl = webUrlSchema(BUSINESS_LIMITS.url.max);
export const socialsSchema = z.strictObject({
  facebook: socialUrl.optional(),
  instagram: socialUrl.optional(),
  linkedin: socialUrl.optional(),
  youtube: socialUrl.optional(),
  x: socialUrl.optional(),
});
export type Socials = z.infer<typeof socialsSchema>;

const tagsSchema = z
  .array(z.string().trim().min(1).max(BUSINESS_LIMITS.tag.max))
  .max(BUSINESS_LIMITS.tagsMax)
  .transform((tags) => [...new Set(tags)]);

/** Fields an owner may leave empty, and clear later with `null`. */
const optionalFields = {
  subcategoryId: z.uuid(),
  gstin: gstinSchema,
  about: z.string().trim().max(BUSINESS_LIMITS.about.max),
  establishedYear: z
    .number()
    .int()
    .min(BUSINESS_LIMITS.establishedYearMin)
    .refine((year) => year <= new Date().getFullYear(), 'Year cannot be in the future'),
  website: webUrlSchema(BUSINESS_LIMITS.url.max),
  contactPerson: z.string().trim().min(TEXT_LIMITS.personName.min).max(TEXT_LIMITS.personName.max),
  contactPhone: businessPhoneSchema,
  contactEmail: emailSchema,
  address: z.string().trim().max(BUSINESS_LIMITS.address.max),
  pincode: z.string().regex(/^[1-9]\d{5}$/, 'Enter a 6-digit PIN code'),
  mapUrl: webUrlSchema(BUSINESS_LIMITS.url.max),
};

const requiredFields = {
  name: z.string().trim().min(BUSINESS_LIMITS.name.min).max(BUSINESS_LIMITS.name.max),
  type: businessTypeSchema,
  /** A top-level category. */
  categoryId: z.uuid(),
  /** The state is taken from the city. */
  cityId: z.uuid(),
};

/** Fields with a default that are never null. */
const defaultedFields = {
  /** Generated from the name when left out. Locked once the business is verified. */
  slug: businessSlugSchema,
  tags: tagsSchema,
  /** Shows the contact phone and email on the public page. */
  isContactPublic: z.boolean(),
  socials: socialsSchema,
  openingHours: openingHoursSchema,
};

const optionalShape = <T extends Record<string, z.ZodType>>(shape: T) =>
  Object.fromEntries(Object.entries(shape).map(([key, schema]) => [key, schema.optional()])) as {
    [K in keyof T]: z.ZodOptional<T[K]>;
  };

const clearableShape = <T extends Record<string, z.ZodType>>(shape: T) =>
  Object.fromEntries(
    Object.entries(shape).map(([key, schema]) => [key, schema.nullable().optional()]),
  ) as { [K in keyof T]: z.ZodOptional<z.ZodNullable<T[K]>> };

export const createBusinessSchema = z.strictObject({
  ...requiredFields,
  ...optionalShape(defaultedFields),
  ...optionalShape(optionalFields),
});
export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;

export const updateBusinessSchema = z.strictObject({
  ...optionalShape(requiredFields),
  ...optionalShape(defaultedFields),
  ...clearableShape(optionalFields),
});
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;

/** A business as shown on its public page. Contact details only when the owner shows them. */
export const businessSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  type: businessTypeSchema,
  category: categoryRefSchema,
  subcategory: categoryRefSchema.nullable(),
  city: citySchema,
  state: stateSchema,
  gstin: z.string().nullable(),
  about: z.string().nullable(),
  establishedYear: z.number().int().nullable(),
  tags: z.array(z.string()),
  website: z.string().nullable(),
  contactPerson: z.string().nullable(),
  contactPhone: z.string().nullable(),
  contactEmail: z.string().nullable(),
  address: z.string().nullable(),
  pincode: z.string().nullable(),
  mapUrl: z.string().nullable(),
  socials: socialsSchema,
  openingHours: openingHoursSchema,
  isVerified: z.boolean(),
  isPremium: z.boolean(),
  createdAt: z.iso.datetime(),
});
export type Business = z.infer<typeof businessSchema>;

/** The owner's view (`/me/business`): every field, plus status the public never sees. */
export const myBusinessSchema = businessSchema.extend({
  isContactPublic: z.boolean(),
  verificationStatus: z.enum(Object.values(VerificationStatus)),
  premiumUntil: z.iso.datetime().nullable(),
  /** 0 to 100; nudges the owner to fill in optional fields (product spec, Signup step 6). */
  profileCompletion: z.number().int().min(0).max(100),
  /** Published products plus services, against the plan limit. */
  publishedListings: z.number().int(),
  publishedListingsLimit: z.number().int().nullable(),
  updatedAt: z.iso.datetime(),
});
export type MyBusiness = z.infer<typeof myBusinessSchema>;

/** The seller card embedded in listing pages. */
export const businessSummarySchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  city: citySchema,
  isVerified: z.boolean(),
  isPremium: z.boolean(),
});
export type BusinessSummary = z.infer<typeof businessSummarySchema>;
