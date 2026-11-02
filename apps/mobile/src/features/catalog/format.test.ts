import { myBusinessSchema, productSchema, serviceSchema } from '@supporters/shared';
import {
  areaLabel,
  formatPrice,
  listingLimitStatus,
  productPriceLabel,
  servicePriceLabel,
} from './format';
import { myBusiness, product, service } from './test-fixtures';

describe('fixtures', () => {
  it('match the API response schemas', () => {
    expect(productSchema.safeParse(product).success).toBe(true);
    expect(serviceSchema.safeParse(service).success).toBe(true);
    expect(myBusinessSchema.safeParse(myBusiness).success).toBe(true);
  });
});

describe('prices', () => {
  it('formats paise as Indian rupees', () => {
    expect(formatPrice({ amountPaise: 12_345_650, currency: 'INR' })).toBe('₹1,23,456.5');
    expect(formatPrice({ amountPaise: 125_000, currency: 'INR' })).toBe('₹1,250');
  });

  it('shows "Ask for price" without a price', () => {
    expect(formatPrice(null)).toBe('Ask for price');
    expect(productPriceLabel({ price: null, unit: 'kg' })).toBe('Ask for price');
    expect(servicePriceLabel({ price: null, priceUnit: 'per_hour' })).toBe('Ask for price');
  });

  it('adds the unit', () => {
    expect(productPriceLabel(product)).toBe('₹1,250 / piece');
    expect(productPriceLabel({ ...product, unit: 'sq_metre' })).toBe('₹1,250 / sq metre');
    expect(
      servicePriceLabel({ price: { amountPaise: 50_000, currency: 'INR' }, priceUnit: 'per_day' }),
    ).toBe('From ₹500 per day');
  });
});

describe('areaLabel', () => {
  it('names the cities and states covered', () => {
    expect(areaLabel(product.shippingArea)).toBe('All India');
    expect(areaLabel(service.serviceArea)).toBe('Surat, Gujarat');
    expect(areaLabel({ allIndia: false, states: [], cities: [] })).toBe('Not set');
  });
});

describe('listingLimitStatus', () => {
  it('counts published listings against the free plan', () => {
    expect(listingLimitStatus(myBusiness)).toEqual({
      isAtLimit: false,
      message: 'Free plan: 3 of 25 listings published.',
    });
  });

  it('explains the limit once it is reached', () => {
    const status = listingLimitStatus({ publishedListings: 25, publishedListingsLimit: 25 });
    expect(status?.isAtLimit).toBe(true);
    expect(status?.message).toMatch(/25 of 25 listings, the free plan limit/);
  });

  it('says nothing on a plan without a limit', () => {
    expect(listingLimitStatus({ publishedListings: 80, publishedListingsLimit: null })).toBeNull();
  });
});
