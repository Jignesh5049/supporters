import {
  createBusinessSchema,
  updateBusinessSchema,
  DayOfWeek,
  type BusinessType,
  type CreateBusinessInput,
  type MyBusiness,
  type OpeningHours,
  type UpdateBusinessInput,
} from '@supporters/shared';

export type Day = (typeof DayOfWeek)[number];

export interface DayHours {
  opens: string;
  closes: string;
}

/** Every field is text, as typed. The shared schemas decide what is valid. */
export interface BusinessFormValues {
  name: string;
  type: BusinessType | '';
  categoryId: string;
  stateCode: string;
  cityId: string;
  about: string;
  contactPerson: string;
  /** The 10 digits; `+91` is added when saved. */
  contactPhone: string;
  contactEmail: string;
  website: string;
  instagram: string;
  facebook: string;
  youtube: string;
  address: string;
  pincode: string;
  mapUrl: string;
  isContactPublic: boolean;
  /** One opening slot per day; a day with both times empty is closed. */
  hours: Record<Day, DayHours>;
  /** Extra slots (split shifts) the form does not edit, kept so saving doesn't drop them. */
  extraSlots: OpeningHours;
  logoMediaId: string | null;
  coverMediaId: string | null;
}

function emptyHours(): Record<Day, DayHours> {
  return Object.fromEntries(DayOfWeek.map((day) => [day, { opens: '', closes: '' }])) as Record<
    Day,
    DayHours
  >;
}

export function emptyBusinessForm(): BusinessFormValues {
  return {
    name: '',
    type: '',
    categoryId: '',
    stateCode: '',
    cityId: '',
    about: '',
    contactPerson: '',
    contactPhone: '',
    contactEmail: '',
    website: '',
    instagram: '',
    facebook: '',
    youtube: '',
    address: '',
    pincode: '',
    mapUrl: '',
    isContactPublic: false,
    hours: emptyHours(),
    extraSlots: [],
    logoMediaId: null,
    coverMediaId: null,
  };
}

/** Fills the form from the owner's business (edit mode). */
export function businessToForm(business: MyBusiness): BusinessFormValues {
  const hours = emptyHours();
  const extraSlots: OpeningHours = [];
  const seen = new Set<Day>();
  for (const slot of business.openingHours) {
    if (seen.has(slot.day)) {
      extraSlots.push(slot);
    } else {
      seen.add(slot.day);
      hours[slot.day] = { opens: slot.opens, closes: slot.closes };
    }
  }
  return {
    name: business.name,
    type: business.type,
    categoryId: business.category.id,
    stateCode: business.city.stateCode,
    cityId: business.city.id,
    about: business.about ?? '',
    contactPerson: business.contactPerson ?? '',
    contactPhone: (business.contactPhone ?? '').replace(/^\+91/, ''),
    contactEmail: business.contactEmail ?? '',
    website: business.website ?? '',
    instagram: business.socials.instagram ?? '',
    facebook: business.socials.facebook ?? '',
    youtube: business.socials.youtube ?? '',
    address: business.address ?? '',
    pincode: business.pincode ?? '',
    mapUrl: business.mapUrl ?? '',
    isContactPublic: business.isContactPublic,
    hours,
    extraSlots,
    logoMediaId: business.logo?.id ?? null,
    coverMediaId: business.cover?.id ?? null,
  };
}

/** 10 digits become `+91…`; spaces, dashes and a leading 91 or 0 are tolerated. */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits === '') return '';
  if (digits.startsWith('+')) return digits;
  const national = digits.replace(/^(91|0)(?=\d{10}$)/, '');
  return `+91${national}`;
}

export const DAY_NAMES: Record<Day, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

/** "9", "9:30", "0930" and "09:30" become "09:30"; anything else is returned as typed. */
export function normaliseTime(raw: string): string {
  const text = raw.trim();
  const match = /^(\d{1,2}):?(\d{2})?$/.exec(text);
  if (!match) return text;
  return `${match[1].padStart(2, '0')}:${match[2] ?? '00'}`;
}

export type BusinessFormResult<T> = { ok: true; input: T } | { ok: false; message: string };

const blank = (value: string) => value.trim() === '';

/** Empty optional text: `undefined` when creating, `null` (clear it) when updating. */
function optionalText(value: string, mode: 'create' | 'update') {
  if (blank(value)) return mode === 'update' ? null : undefined;
  return value.trim();
}

function openingHours(values: BusinessFormValues): BusinessFormResult<OpeningHours> {
  const slots: OpeningHours = [];
  for (const day of DayOfWeek) {
    const { opens, closes } = values.hours[day];
    if (blank(opens) && blank(closes)) continue;
    if (blank(opens) || blank(closes)) {
      return { ok: false, message: `Enter both opening and closing time for ${DAY_NAMES[day]}.` };
    }
    slots.push({ day, opens: normaliseTime(opens), closes: normaliseTime(closes) });
  }
  return { ok: true, input: [...slots, ...values.extraSlots] };
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Business name',
  type: 'Business type',
  categoryId: 'Category',
  cityId: 'City',
  about: 'About',
  contactPerson: 'Contact person',
  contactPhone: 'Contact phone',
  contactEmail: 'Email',
  website: 'Website',
  address: 'Address',
  pincode: 'PIN code',
  mapUrl: 'Map link',
  socials: 'Social link',
  openingHours: 'Opening hours',
};

function firstIssue(issue: { path: PropertyKey[]; message: string } | undefined): string {
  if (!issue) return 'Check the details and try again.';
  const [field] = issue.path;
  const label = typeof field === 'string' ? FIELD_LABELS[field] : undefined;
  return label ? `${label}: ${issue.message}` : issue.message;
}

function sharedFields(values: BusinessFormValues, mode: 'create' | 'update') {
  const socials = Object.fromEntries(
    (['instagram', 'facebook', 'youtube'] as const)
      .filter((key) => !blank(values[key]))
      .map((key) => [key, values[key].trim()]),
  );
  const phone = normalisePhone(values.contactPhone);
  return {
    name: values.name.trim(),
    type: values.type === '' ? undefined : values.type,
    categoryId: blank(values.categoryId) ? undefined : values.categoryId,
    cityId: blank(values.cityId) ? undefined : values.cityId,
    about: optionalText(values.about, mode),
    contactPerson: optionalText(values.contactPerson, mode),
    contactPhone: phone === '' ? (mode === 'update' ? null : undefined) : phone,
    contactEmail: optionalText(values.contactEmail, mode),
    website: optionalText(values.website, mode),
    address: optionalText(values.address, mode),
    pincode: optionalText(values.pincode, mode),
    mapUrl: optionalText(values.mapUrl, mode),
    socials,
    isContactPublic: values.isContactPublic,
    logoMediaId: values.logoMediaId ?? (mode === 'update' ? null : undefined),
    coverMediaId: values.coverMediaId ?? (mode === 'update' ? null : undefined),
  };
}

/**
 * Builds the body for POST /me/business. Missing required fields are named in
 * plain words; the rest of the rules come from the shared schema.
 */
export function buildCreateBusinessInput(
  values: BusinessFormValues,
): BusinessFormResult<CreateBusinessInput> {
  if (blank(values.name)) return { ok: false, message: 'Enter your business name.' };
  if (values.type === '') return { ok: false, message: 'Choose a business type.' };
  if (blank(values.categoryId)) return { ok: false, message: 'Choose a category.' };
  if (blank(values.cityId)) return { ok: false, message: 'Choose your state and city.' };
  const hours = openingHours(values);
  if (!hours.ok) return hours;
  const result = createBusinessSchema.safeParse({
    ...sharedFields(values, 'create'),
    ...(hours.input.length > 0 ? { openingHours: hours.input } : {}),
  });
  return result.success
    ? { ok: true, input: result.data }
    : { ok: false, message: firstIssue(result.error.issues[0]) };
}

/** Builds the body for PATCH /me/business; emptied optional fields are cleared with `null`. */
export function buildUpdateBusinessInput(
  values: BusinessFormValues,
): BusinessFormResult<UpdateBusinessInput> {
  if (blank(values.name)) return { ok: false, message: 'Enter your business name.' };
  if (values.type === '') return { ok: false, message: 'Choose a business type.' };
  if (blank(values.categoryId)) return { ok: false, message: 'Choose a category.' };
  if (blank(values.cityId)) return { ok: false, message: 'Choose your state and city.' };
  const hours = openingHours(values);
  if (!hours.ok) return hours;
  const result = updateBusinessSchema.safeParse({
    ...sharedFields(values, 'update'),
    openingHours: hours.input,
  });
  return result.success
    ? { ok: true, input: result.data }
    : { ok: false, message: firstIssue(result.error.issues[0]) };
}
