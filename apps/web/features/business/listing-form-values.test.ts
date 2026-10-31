import { describe, expect, it } from 'vitest';
import { productFixture, serviceFixture } from '@/lib/catalog/fixtures';
import { FORM_PARSE_OPTIONS } from './form-errors';
import {
  EMPTY_PRODUCT_FORM,
  EMPTY_SERVICE_FORM,
  createProductFormSchema,
  createServiceFormSchema,
  listingErrorField,
  productToFormValues,
  serviceToFormValues,
  updateProductFormSchema,
  updateServiceFormSchema,
} from './listing-form-values';

const CATEGORY = '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a03';
const IMAGE = { id: '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a21', url: 'https://media.example/a.webp' };
const STATE = '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a02';

const product = {
  ...EMPTY_PRODUCT_FORM,
  title: ' Cotton poplin ',
  categoryId: CATEGORY,
  description: 'Soft cotton.',
};

const paths = (result: { error?: { issues: { path: PropertyKey[]; message: string }[] } }) =>
  Object.fromEntries((result.error?.issues ?? []).map((i) => [i.path.join('.'), i.message]));

describe('product form', () => {
  it('makes a draft with no price ("Ask for price") and All India shipping', () => {
    const result = createProductFormSchema.safeParse(product, FORM_PARSE_OPTIONS);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      title: 'Cotton poplin',
      status: 'draft',
      availability: 'in_stock',
      shippingArea: { allIndia: true, stateIds: [], cityIds: [] },
      specs: [],
      mediaIds: [],
    });
    expect(result.data).not.toHaveProperty('price');
  });

  it('converts rupees to paise and keeps image order', () => {
    const result = createProductFormSchema.safeParse(
      {
        ...product,
        price: '1,499.50',
        originalPrice: '1999',
        unit: 'metre',
        moq: '100',
        images: [IMAGE, { ...IMAGE, id: '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a22' }],
        allIndia: false,
        stateIds: [STATE],
        specs: [
          { key: ' GSM ', value: ' 120 ' },
          { key: '', value: '' },
        ],
        status: 'published',
      },
      FORM_PARSE_OPTIONS,
    );
    expect(result.data).toMatchObject({
      price: { amountPaise: 149_950, currency: 'INR' },
      originalPrice: { amountPaise: 199_900, currency: 'INR' },
      moq: 100,
      mediaIds: [IMAGE.id, '4b0c4c55-3f6d-4b1f-9a51-2b2c0f3c9a22'],
      shippingArea: { allIndia: false, stateIds: [STATE], cityIds: [] },
      specs: [{ key: 'GSM', value: '120' }],
      status: 'published',
    });
  });

  it('reports bad prices and the shared price-order rule', () => {
    expect(
      paths(createProductFormSchema.safeParse({ ...product, price: 'ten' }, FORM_PARSE_OPTIONS)),
    ).toEqual({
      'price.amountPaise': 'Enter a number',
    });
    expect(
      paths(
        createProductFormSchema.safeParse(
          { ...product, price: '200', originalPrice: '150' },
          FORM_PARSE_OPTIONS,
        ),
      ),
    ).toEqual({ originalPrice: 'The original price must be above the price' });
    expect(
      paths(createProductFormSchema.safeParse({ ...product, moq: '0' }, FORM_PARSE_OPTIONS)),
    ).toEqual({
      moq: 'Must be at least 1',
    });
  });

  it('flags duplicate specification keys and missing core fields', () => {
    const result = createProductFormSchema.safeParse(
      {
        ...product,
        title: '',
        categoryId: '',
        specs: [
          { key: 'GSM', value: '1' },
          { key: 'gsm', value: '2' },
        ],
      },
      FORM_PARSE_OPTIONS,
    );
    expect(paths(result)).toEqual({
      title: 'Required',
      categoryId: 'Choose an option',
      specs: 'Each specification key must be unique',
    });
  });

  it('clears emptied optional fields with null on update, and round-trips an existing product', () => {
    const values = productToFormValues(productFixture);
    expect(values).toMatchObject({ price: '149.50', originalPrice: '199', moq: '100' });
    const cleared = updateProductFormSchema.safeParse(
      { ...values, price: '', originalPrice: '', moq: '', deliveryTime: '' },
      FORM_PARSE_OPTIONS,
    );
    expect(cleared.data).toMatchObject({
      price: null,
      originalPrice: null,
      moq: null,
      deliveryTime: null,
    });
    expect(updateProductFormSchema.safeParse(values, FORM_PARSE_OPTIONS).success).toBe(true);
  });
});

describe('service form', () => {
  it('splits features by line and sends a starting price with its unit', () => {
    const result = createServiceFormSchema.safeParse(
      {
        ...EMPTY_SERVICE_FORM,
        title: 'Dyeing',
        categoryId: CATEGORY,
        description: 'Reactive dyes.',
        price: '500',
        priceUnit: 'per_job',
        features: 'Colour matching\n\n  Fast delivery  ',
      },
      FORM_PARSE_OPTIONS,
    );
    expect(result.data).toMatchObject({
      price: { amountPaise: 50_000 },
      priceUnit: 'per_job',
      availability: 'by_appointment',
      features: ['Colour matching', 'Fast delivery'],
      serviceArea: { allIndia: true },
    });
  });

  it('round-trips an existing service', () => {
    const values = serviceToFormValues(serviceFixture);
    expect(values).toMatchObject({ price: '', allIndia: false, stateIds: [STATE] });
    expect(updateServiceFormSchema.safeParse(values, FORM_PARSE_OPTIONS).success).toBe(true);
  });
});

describe('listingErrorField', () => {
  it('maps API paths to the form inputs', () => {
    expect(listingErrorField('mediaIds')).toBe('images');
    expect(listingErrorField('mediaIds.3')).toBe('images');
    expect(listingErrorField('shippingArea.stateIds')).toBe('stateIds');
    expect(listingErrorField('price.amountPaise')).toBe('price.amountPaise');
  });
});
