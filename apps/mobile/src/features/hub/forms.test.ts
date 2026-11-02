import { ListingStatus } from '@supporters/shared';
import { ApiError, ApiErrorCode } from '../../lib/api/errors';
import { ids, myBusiness, product, service } from '../catalog/test-fixtures';
import {
  apiFieldErrors,
  businessToForm,
  emptyBusinessForm,
  emptyProductForm,
  emptyServiceForm,
  paiseToRupees,
  productToForm,
  rupeesToPaise,
  serviceToForm,
  toBusinessPhone,
  toCreateBusinessInput,
  toProductInput,
  toProductUpdate,
  toServiceInput,
  toUpdateBusinessInput,
} from './forms';

describe('rupee amounts', () => {
  it('parses what owners type', () => {
    expect(rupeesToPaise('1,250')).toBe(125_000);
    expect(rupeesToPaise('₹ 99.5')).toBe(9_950);
    expect(rupeesToPaise('')).toBeUndefined();
    expect(rupeesToPaise('12abc')).toBeNaN();
    expect(rupeesToPaise('1.234')).toBeNaN();
  });

  it('round-trips paise', () => {
    expect(paiseToRupees(125_000)).toBe('1250');
    expect(paiseToRupees(9_950)).toBe('99.50');
    expect(paiseToRupees(null)).toBe('');
  });
});

describe('toProductInput', () => {
  const valid = {
    ...emptyProductForm,
    title: '  Cotton kurta ',
    description: 'Hand block printed.',
    categoryId: ids.category,
    price: '450',
    unit: 'piece',
    moq: '20',
  };

  it('builds the API body', () => {
    const result = toProductInput(valid);
    expect(result).toEqual({
      success: true,
      data: expect.objectContaining({
        title: 'Cotton kurta',
        price: { amountPaise: 45_000, currency: 'INR' },
        unit: 'piece',
        moq: 20,
        mediaIds: [],
        status: ListingStatus.Draft,
      }),
    });
  });

  it('leaves the price out for "Ask for price"', () => {
    const result = toProductInput({ ...valid, price: '' });
    expect(result.success && result.data.price).toBeUndefined();
  });

  it('reports readable field errors', () => {
    const result = toProductInput({ ...emptyProductForm, price: 'abc' });
    expect(result).toEqual({
      success: false,
      errors: expect.objectContaining({
        title: 'Required',
        description: 'Required',
        categoryId: 'Choose a category',
        price: 'Enter a price in rupees, like 1250',
      }),
    });
  });

  it("keeps the schema's own message for the original price rule", () => {
    const result = toProductInput({ ...valid, originalPrice: '400' });
    expect(result.success).toBe(false);
    expect(!result.success && result.errors.originalPrice).toBe(
      'The original price must be above the price',
    );
  });

  it('round-trips an existing product', () => {
    const result = toProductInput(productToForm(product));
    expect(result.success && result.data).toEqual(
      expect.objectContaining({
        title: product.title,
        price: product.price,
        moq: 10,
        mediaIds: [product.images[0]?.id],
        status: 'published',
      }),
    );
  });

  it('clears emptied optional fields on update', () => {
    const result = toProductInput({ ...productToForm(product), price: '', moq: '' });
    if (!result.success) throw new Error('expected a valid form');
    expect(toProductUpdate(result.data)).toEqual(
      expect.objectContaining({ price: null, moq: null, originalPrice: null }),
    );
  });
});

describe('toServiceInput', () => {
  it('splits features by line', () => {
    const result = toServiceInput({
      ...emptyServiceForm,
      title: 'Embroidery',
      description: 'Machine and hand work.',
      categoryId: ids.category,
      features: 'Free pickup\n\n  Same-day finishing  ',
    });
    expect(result.success && result.data.features).toEqual(['Free pickup', 'Same-day finishing']);
  });

  it('round-trips an existing service', () => {
    expect(toServiceInput(serviceToForm(service)).success).toBe(true);
  });
});

describe('business forms', () => {
  const valid = {
    ...emptyBusinessForm,
    name: 'Asha Traders',
    type: 'wholesaler' as const,
    categoryId: ids.category,
    stateCode: 'GJ',
    cityId: ids.city,
    contactPhone: '98765 43210',
  };

  it('normalises phone numbers to +91', () => {
    expect(toBusinessPhone('98765 43210')).toBe('+919876543210');
    expect(toBusinessPhone('+91 98765 43210')).toBe('+919876543210');
    expect(toBusinessPhone('')).toBeUndefined();
  });

  it('creates with only the fields filled in', () => {
    const result = toCreateBusinessInput(valid);
    expect(result).toEqual({
      success: true,
      data: expect.objectContaining({ name: 'Asha Traders', contactPhone: '+919876543210' }),
    });
    expect(result.success && 'about' in result.data && result.data.about).toBeFalsy();
  });

  it('asks for the required choices', () => {
    const result = toCreateBusinessInput(emptyBusinessForm);
    expect(!result.success && result.errors).toEqual(
      expect.objectContaining({
        name: 'Use at least 2 characters',
        type: 'Choose a business type',
        categoryId: 'Choose a category',
        cityId: 'Choose a city',
      }),
    );
  });

  it('clears emptied fields with null when editing', () => {
    const result = toUpdateBusinessInput({ ...businessToForm(myBusiness), about: '' });
    expect(result.success && result.data).toEqual(
      expect.objectContaining({ about: null, logoMediaId: null, contactPhone: '+919876543210' }),
    );
  });
});

describe('apiFieldErrors', () => {
  it('marks the rejected fields without showing server text', () => {
    const error = new ApiError(400, ApiErrorCode.ValidationFailed, {
      fieldErrors: [
        { path: 'body.categoryId', message: 'Category is inactive (internal detail)' },
        { path: 'body.price.amountPaise', message: 'Too big' },
      ],
    });
    expect(apiFieldErrors(error)).toEqual({
      categoryId: 'Check this field',
      price: 'Check this field',
    });
    expect(apiFieldErrors(new Error('boom'))).toEqual({});
  });
});
