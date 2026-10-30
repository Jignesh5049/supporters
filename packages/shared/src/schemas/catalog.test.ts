import { describe, expect, it } from 'vitest';
import {
  createBusinessSchema,
  gstinCheckChar,
  gstinSchema,
  updateBusinessSchema,
} from './business';

const uuid = '0199f4a0-0000-7000-8000-000000000001';

describe('gstinSchema', () => {
  it('accepts a GSTIN with a valid check character, in any case', () => {
    expect(gstinSchema.parse(' 27aapfu0939f1zv ')).toBe('27AAPFU0939F1ZV');
  });

  it('rejects a wrong check character or shape', () => {
    expect(gstinCheckChar('27AAPFU0939F1Z')).toBe('V');
    expect(gstinSchema.safeParse('27AAPFU0939F1ZA').success).toBe(false);
    expect(gstinSchema.safeParse('27AAPFU0939F1V').success).toBe(false);
  });
});

describe('business schemas', () => {
  const base = { name: 'Asha Traders', type: 'wholesaler', categoryId: uuid, cityId: uuid };

  it('rejects unknown keys, so owners cannot set verification or premium', () => {
    expect(
      createBusinessSchema.safeParse({ ...base, verificationStatus: 'verified' }).success,
    ).toBe(false);
    expect(updateBusinessSchema.safeParse({ premiumUntil: '2030-01-01' }).success).toBe(false);
  });

  it('only accepts http(s) links', () => {
    expect(
      createBusinessSchema.safeParse({ ...base, website: 'javascript:alert(1)' }).success,
    ).toBe(false);
    expect(createBusinessSchema.safeParse({ ...base, website: 'https://asha.in' }).success).toBe(
      true,
    );
  });

  it('lets optional fields be cleared, but not required ones', () => {
    expect(updateBusinessSchema.safeParse({ about: null }).success).toBe(true);
    expect(updateBusinessSchema.safeParse({ name: null }).success).toBe(false);
  });
});
