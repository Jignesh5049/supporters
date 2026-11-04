import { ListingStatus } from '@supporters/shared';
import { uuid } from '../social/fixtures';
import { makeProduct, makeService } from './fixtures';
import {
  buildCreateProductInput,
  buildCreateServiceInput,
  buildUpdateProductInput,
  buildUpdateServiceInput,
  EMPTY_PRODUCT_FORM,
  EMPTY_SERVICE_FORM,
  paiseToRupees,
  parseSpecs,
  productToForm,
  rupeesToPaise,
  serviceToForm,
  type ProductFormValues,
  type ServiceFormValues,
} from './listing-form';

const product = (overrides: Partial<ProductFormValues> = {}): ProductFormValues => ({
  ...EMPTY_PRODUCT_FORM,
  title: 'Cotton roll',
  categoryId: uuid(800),
  description: 'Soft cotton',
  mediaIds: [uuid(700)],
  ...overrides,
});

const service = (overrides: Partial<ServiceFormValues> = {}): ServiceFormValues => ({
  ...EMPTY_SERVICE_FORM,
  title: 'CNC turning',
  categoryId: uuid(800),
  description: 'Precision work',
  mediaIds: [uuid(700)],
  ...overrides,
});

describe('rupeesToPaise', () => {
  it('converts rupees to integer paise', () => {
    expect(rupeesToPaise('1500')).toBe(150_000);
    expect(rupeesToPaise('₹1,500.50')).toBe(150_050);
    expect(rupeesToPaise('0.07')).toBe(7);
  });

  it('treats empty as no price and refuses the rest', () => {
    expect(rupeesToPaise('  ')).toBeNull();
    expect(rupeesToPaise('abc')).toBeNaN();
    expect(rupeesToPaise('0')).toBeNaN();
    expect(rupeesToPaise('1.234')).toBeNaN();
    expect(rupeesToPaise('-5')).toBeNaN();
  });

  it('shows paise back as rupees', () => {
    expect(paiseToRupees(150_000)).toBe('1500');
    expect(paiseToRupees(150_050)).toBe('1500.50');
    expect(paiseToRupees(null)).toBe('');
  });
});

describe('parseSpecs', () => {
  it('reads Name: value lines', () => {
    expect(parseSpecs('Material: Steel\n\n Size : 5: inch ')).toEqual([
      { key: 'Material', value: 'Steel' },
      { key: 'Size', value: '5: inch' },
    ]);
  });

  it('refuses a line without a name or value', () => {
    expect(parseSpecs('Steel')).toBeNull();
    expect(parseSpecs(': Steel')).toBeNull();
    expect(parseSpecs('Material:')).toBeNull();
  });
});

describe('buildCreateProductInput', () => {
  it('builds a published product with price in paise', () => {
    const result = buildCreateProductInput(
      product({ price: '1500', unit: 'piece', moq: '50', specs: 'Material: Cotton' }),
      ListingStatus.Published,
    );
    expect(result).toMatchObject({
      ok: true,
      input: {
        title: 'Cotton roll',
        price: { amountPaise: 150_000, currency: 'INR' },
        unit: 'piece',
        moq: 50,
        status: 'published',
        specs: [{ key: 'Material', value: 'Cotton' }],
        shippingArea: { allIndia: true },
      },
    });
  });

  it('allows no price ("Ask for price")', () => {
    const result = buildCreateProductInput(product(), ListingStatus.Draft);
    expect(result.ok && result.input.price).toBeUndefined();
  });

  it('needs a photo to publish but not for a draft', () => {
    expect(buildCreateProductInput(product({ mediaIds: [] }), ListingStatus.Published)).toEqual({
      ok: false,
      message: 'Add at least one photo to publish.',
    });
    expect(buildCreateProductInput(product({ mediaIds: [] }), ListingStatus.Draft).ok).toBe(true);
  });

  it('refuses more than 10 photos, a bad price, and an original price below the price', () => {
    const many = Array.from({ length: 11 }, (_, i) => uuid(600 + i));
    expect(buildCreateProductInput(product({ mediaIds: many }), ListingStatus.Draft).ok).toBe(
      false,
    );
    expect(buildCreateProductInput(product({ price: 'free' }), ListingStatus.Draft).ok).toBe(false);
    expect(
      buildCreateProductInput(product({ price: '100', originalPrice: '90' }), ListingStatus.Draft),
    ).toMatchObject({ ok: false, message: expect.stringContaining('original price') });
  });

  it('needs a title, category and description, and an area', () => {
    expect(buildCreateProductInput(product({ title: ' ' }), ListingStatus.Draft)).toMatchObject({
      ok: false,
      message: expect.stringContaining('Title'),
    });
    expect(buildCreateProductInput(product({ categoryId: '' }), ListingStatus.Draft).ok).toBe(
      false,
    );
    expect(
      buildCreateProductInput(
        product({ area: { allIndia: false, stateIds: [], cityIds: [] } }),
        ListingStatus.Draft,
      ),
    ).toEqual({ ok: false, message: 'Choose All India or at least one state.' });
  });
});

describe('buildUpdateProductInput', () => {
  it('round-trips a product and keeps its status', () => {
    const values = productToForm(makeProduct(1, { originalPrice: null }));
    expect(buildUpdateProductInput(values, ListingStatus.Published)).toMatchObject({
      ok: true,
      input: {
        price: { amountPaise: 150_000 },
        originalPrice: null,
        unit: 'piece',
        moq: 50,
        status: 'published',
      },
    });
  });

  it('clears emptied fields with null', () => {
    const values = { ...productToForm(makeProduct(1)), price: '', unit: '' as const, moq: '' };
    expect(buildUpdateProductInput(values, ListingStatus.Draft)).toMatchObject({
      ok: true,
      input: { price: null, unit: null, moq: null, deliveryTime: '3 to 5 days' },
    });
  });
});

describe('services', () => {
  it('builds a service with features from lines', () => {
    const result = buildCreateServiceInput(
      service({ price: '5000', priceUnit: 'per_job', features: 'Free visit\n\n On time ' }),
      ListingStatus.Published,
    );
    expect(result).toMatchObject({
      ok: true,
      input: {
        price: { amountPaise: 500_000, currency: 'INR' },
        priceUnit: 'per_job',
        features: ['Free visit', 'On time'],
        serviceArea: { allIndia: true },
      },
    });
  });

  it('needs a photo to publish', () => {
    expect(buildCreateServiceInput(service({ mediaIds: [] }), ListingStatus.Published).ok).toBe(
      false,
    );
  });

  it('keeps chosen cities when a service is saved again', () => {
    const base = makeService(2);
    const values = serviceToForm({
      ...base,
      serviceArea: {
        allIndia: false,
        states: [],
        cities: [{ id: uuid(901), name: 'Surat', stateCode: 'GJ' }],
      },
    });
    expect(buildUpdateServiceInput(values, ListingStatus.Published)).toMatchObject({
      ok: true,
      input: { serviceArea: { allIndia: false, cityIds: [uuid(901)] } },
    });
  });

  it('clears the price with null on update', () => {
    const values = { ...serviceToForm(makeService(2)), price: '', turnaround: '' };
    expect(buildUpdateServiceInput(values, ListingStatus.Draft)).toMatchObject({
      input: { price: null, turnaround: null, status: 'draft' },
    });
  });
});
