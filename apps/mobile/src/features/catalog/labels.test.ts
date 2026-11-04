import type { Product, Service } from '@supporters/shared';
import { areaLabel, moqLabel, productPriceLabel, servicePriceLabel } from './labels';

const price = (rupees: number) => ({ amountPaise: rupees * 100, currency: 'INR' as const });

describe('price labels', () => {
  it('adds the unit', () => {
    expect(productPriceLabel({ price: price(1200), unit: 'sq_metre' } as Product)).toBe(
      '₹1,200 / sq metre',
    );
    expect(servicePriceLabel({ price: price(500), priceUnit: 'per_hour' } as Service)).toBe(
      '₹500 per hour',
    );
  });

  it('asks for the price when there is none', () => {
    expect(productPriceLabel({ price: null, unit: 'kg' } as Product)).toBe('Ask for price');
  });

  it('shows the minimum order', () => {
    expect(moqLabel({ moq: 1000, unit: 'piece' } as Product)).toBe('MOQ: 1,000 piece');
    expect(moqLabel({ moq: null, unit: null } as Product)).toBeNull();
  });
});

describe('areaLabel', () => {
  it('names the area', () => {
    expect(areaLabel({ allIndia: true, states: [], cities: [] })).toBe('All India');
    expect(
      areaLabel({
        allIndia: false,
        states: [{ id: 's', code: 'GJ', name: 'Gujarat' }],
        cities: [{ id: 'c', name: 'Surat', stateCode: 'GJ' }],
      }),
    ).toBe('Surat, Gujarat');
  });
});
