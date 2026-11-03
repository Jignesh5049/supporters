import type { MyBusiness } from '@supporters/shared';
import { describe, expect, it } from 'vitest';
import { businessFixture } from '@/lib/catalog/fixtures';
import {
  type BusinessFormValues,
  EMPTY_BUSINESS_FORM,
  businessToFormValues,
  createBusinessFormSchema,
  splitTags,
  updateBusinessFormSchema,
} from './business-form-values';
import { FORM_PARSE_OPTIONS } from './form-errors';

const CATEGORY = '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a03';
const CITY = '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a01';

const filled: BusinessFormValues = {
  ...EMPTY_BUSINESS_FORM,
  name: '  Asha Traders ',
  type: 'wholesaler',
  categoryId: CATEGORY,
  stateCode: 'GJ',
  cityId: CITY,
};

function issues(result: {
  success: boolean;
  error?: { issues: { path: PropertyKey[]; message: string }[] };
}) {
  return Object.fromEntries(
    (result.error?.issues ?? []).map((issue) => [issue.path.join('.'), issue.message]),
  );
}

describe('createBusinessFormSchema', () => {
  it('turns the minimum form into a valid create body', () => {
    const result = createBusinessFormSchema.safeParse(filled, FORM_PARSE_OPTIONS);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: 'Asha Traders',
      type: 'wholesaler',
      categoryId: CATEGORY,
      cityId: CITY,
      isContactPublic: false,
      tags: [],
      socials: {},
    });
  });

  it('normalises phone, year, tags and socials', () => {
    const result = createBusinessFormSchema.safeParse(
      {
        ...filled,
        contactPhone: '98250 14890',
        establishedYear: ' 2004 ',
        tags: 'cotton, silk, , cotton',
        socials: { ...filled.socials, instagram: ' https://instagram.com/asha ' },
      },
      FORM_PARSE_OPTIONS,
    );
    expect(result.data).toMatchObject({
      contactPhone: '+919825014890',
      establishedYear: 2004,
      tags: ['cotton', 'silk'],
      socials: { instagram: 'https://instagram.com/asha' },
    });
  });

  it('reports the shared rules on the form fields, in plain English', () => {
    const result = createBusinessFormSchema.safeParse(
      {
        ...filled,
        name: 'A',
        type: '',
        cityId: '',
        gstin: '27AAAAA0000A1Z0',
        establishedYear: 'soon',
        pincode: '012345',
        website: 'javascript:alert(1)',
        socials: { ...filled.socials, x: 'not a link' },
      },
      FORM_PARSE_OPTIONS,
    );
    expect(result.success).toBe(false);
    expect(issues(result)).toEqual({
      name: 'Use at least 2 characters',
      type: 'Choose an option',
      cityId: 'Choose an option',
      gstin: 'Enter a valid GSTIN',
      establishedYear: 'Enter a number',
      pincode: 'Enter a 6-digit PIN code',
      website: 'Enter a full link starting with https://',
      'socials.x': 'Enter a full link starting with https://',
    });
  });

  it('rejects a +91 number that is too short', () => {
    const result = createBusinessFormSchema.safeParse(
      { ...filled, contactPhone: '12345' },
      FORM_PARSE_OPTIONS,
    );
    expect(issues(result)).toEqual({ contactPhone: 'Enter a +91 number' });
  });
});

describe('updateBusinessFormSchema', () => {
  it('clears blank optional fields with null', () => {
    const result = updateBusinessFormSchema.safeParse(filled, FORM_PARSE_OPTIONS);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      about: null,
      website: null,
      contactPhone: null,
      establishedYear: null,
      logoMediaId: null,
      coverMediaId: null,
    });
  });
});

describe('businessToFormValues', () => {
  const mine: MyBusiness = {
    ...businessFixture,
    isContactPublic: true,
    verificationStatus: 'none',
    premiumUntil: null,
    profileCompletion: 40,
    publishedListings: 3,
    publishedListingsLimit: 25,
    updatedAt: businessFixture.createdAt,
  };

  it('fills the edit form, and the form round-trips to a valid update', () => {
    const values = businessToFormValues(mine);
    expect(values).toMatchObject({
      name: 'Sharma Textiles',
      stateCode: 'GJ',
      establishedYear: '2004',
      tags: 'cotton',
      isContactPublic: true,
      socials: { instagram: 'https://instagram.com/sharma', x: '' },
      logoMediaId: businessFixture.logo?.id,
    });
    const result = updateBusinessFormSchema.safeParse(values, FORM_PARSE_OPTIONS);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({ name: 'Sharma Textiles', tags: ['cotton'] });
  });
});

describe('splitTags', () => {
  it('trims and drops empty tags', () => {
    expect(splitTags(' a, b ,,c ')).toEqual(['a', 'b', 'c']);
  });
});
