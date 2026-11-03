import {
  type MyBusiness,
  type Socials,
  createBusinessSchema,
  updateBusinessSchema,
} from '@supporters/shared';
import { z } from 'zod';
import { toE164 } from '@/features/auth/pending-flow';

/**
 * The business form holds strings, as inputs do. Its field names mirror the
 * API body (`socials.instagram`, `establishedYear`), so the issues from the
 * shared schemas land on the right inputs. Nothing here re-states a rule:
 * every limit and format comes from `createBusinessSchema` /
 * `updateBusinessSchema` in packages/shared.
 */
const SOCIAL_KEYS = ['facebook', 'instagram', 'linkedin', 'youtube', 'x'] as const;

const formValuesSchema = z.object({
  name: z.string(),
  type: z.string(),
  categoryId: z.string(),
  subcategoryId: z.string(),
  /** Only narrows the city list; the API takes the state from the city. */
  stateCode: z.string(),
  cityId: z.string(),
  about: z.string(),
  establishedYear: z.string(),
  gstin: z.string(),
  contactPerson: z.string(),
  contactPhone: z.string(),
  contactEmail: z.string(),
  isContactPublic: z.boolean(),
  website: z.string(),
  address: z.string(),
  pincode: z.string(),
  mapUrl: z.string(),
  /** Comma-separated in the form. */
  tags: z.string(),
  socials: z.object({
    facebook: z.string(),
    instagram: z.string(),
    linkedin: z.string(),
    youtube: z.string(),
    x: z.string(),
  }),
  logoMediaId: z.string().nullable(),
  coverMediaId: z.string().nullable(),
});
export type BusinessFormValues = z.infer<typeof formValuesSchema>;

export const EMPTY_BUSINESS_FORM: BusinessFormValues = {
  name: '',
  type: '',
  categoryId: '',
  subcategoryId: '',
  stateCode: '',
  cityId: '',
  about: '',
  establishedYear: '',
  gstin: '',
  contactPerson: '',
  contactPhone: '',
  contactEmail: '',
  isContactPublic: false,
  website: '',
  address: '',
  pincode: '',
  mapUrl: '',
  tags: '',
  socials: { facebook: '', instagram: '', linkedin: '', youtube: '', x: '' },
  logoMediaId: null,
  coverMediaId: null,
};

/** Optional text: blank is "not set" (left out on create, cleared with null on update). */
const OPTIONAL_TEXT = [
  'subcategoryId',
  'about',
  'gstin',
  'contactPerson',
  'contactEmail',
  'website',
  'address',
  'pincode',
  'mapUrl',
] as const;

type Mode = 'create' | 'update';

/** A year typed as four digits becomes a number; anything else stays text so the schema rejects it. */
function toYear(value: string): number | string {
  const trimmed = value.trim();
  return /^\d{1,4}$/.test(trimmed) ? Number(trimmed) : trimmed;
}

export function splitTags(value: string): string[] {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

/** Form values to the API body. Unknown keys are dropped; the shared schema validates the rest. */
export function toBusinessBody(values: BusinessFormValues, mode: Mode): Record<string, unknown> {
  const blank = mode === 'create' ? undefined : null;
  const body: Record<string, unknown> = {
    name: values.name.trim(),
    type: values.type,
    categoryId: values.categoryId,
    cityId: values.cityId,
    isContactPublic: values.isContactPublic,
    tags: splitTags(values.tags),
  };
  for (const key of OPTIONAL_TEXT) {
    const value = values[key].trim();
    body[key] = value === '' ? blank : value;
  }
  const year = values.establishedYear.trim();
  body.establishedYear = year === '' ? blank : toYear(year);
  const phone = values.contactPhone.trim();
  body.contactPhone = phone === '' ? blank : toE164(phone);

  const socials: Socials = {};
  for (const key of SOCIAL_KEYS) {
    const value = values.socials[key].trim();
    if (value) socials[key] = value;
  }
  body.socials = socials;

  // Images are set only by uploads; on update null removes one.
  body.logoMediaId = values.logoMediaId ?? blank;
  body.coverMediaId = values.coverMediaId ?? blank;

  return Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined));
}

/** For the create form: form values in, a valid `POST /v1/me/business` body out. */
export const createBusinessFormSchema = formValuesSchema
  .transform((values) => toBusinessBody(values, 'create'))
  .pipe(createBusinessSchema);

/** For the edit form: a valid `PATCH /v1/me/business` body. */
export const updateBusinessFormSchema = formValuesSchema
  .transform((values) => toBusinessBody(values, 'update'))
  .pipe(updateBusinessSchema);

/** The owner's business as edit-form values. */
export function businessToFormValues(business: MyBusiness): BusinessFormValues {
  return {
    name: business.name,
    type: business.type,
    categoryId: business.category.id,
    subcategoryId: business.subcategory?.id ?? '',
    stateCode: business.state.code,
    cityId: business.city.id,
    about: business.about ?? '',
    establishedYear: business.establishedYear ? String(business.establishedYear) : '',
    gstin: business.gstin ?? '',
    contactPerson: business.contactPerson ?? '',
    contactPhone: business.contactPhone ?? '',
    contactEmail: business.contactEmail ?? '',
    isContactPublic: business.isContactPublic,
    website: business.website ?? '',
    address: business.address ?? '',
    pincode: business.pincode ?? '',
    mapUrl: business.mapUrl ?? '',
    tags: business.tags.join(', '),
    socials: {
      facebook: business.socials.facebook ?? '',
      instagram: business.socials.instagram ?? '',
      linkedin: business.socials.linkedin ?? '',
      youtube: business.socials.youtube ?? '',
      x: business.socials.x ?? '',
    },
    logoMediaId: business.logo?.id ?? null,
    coverMediaId: business.cover?.id ?? null,
  };
}
