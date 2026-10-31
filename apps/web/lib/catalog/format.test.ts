import { describe, expect, it } from 'vitest';
import { businessFixture, productFixture, serviceFixture } from './fixtures';
import {
  ASK_FOR_PRICE,
  areaLabel,
  businessAddress,
  formatMoney,
  initials,
  listingPriceText,
  moneyToDecimal,
  openingHoursLines,
  paiseToRupees,
  rupeesToPaise,
  truncate,
} from './format';

const inr = (amountPaise: number) => ({ amountPaise, currency: 'INR' as const });

describe('money', () => {
  it('formats paise as Indian rupees with lakh grouping', () => {
    expect(formatMoney(inr(12_500_000))).toBe('₹1,25,000');
    expect(formatMoney(inr(9_950))).toBe('₹99.50');
  });

  it('gives schema.org a plain decimal', () => {
    expect(moneyToDecimal(inr(14_950))).toBe('149.50');
    expect(moneyToDecimal(inr(100_000))).toBe('1000');
    expect(moneyToDecimal(inr(5))).toBe('0.05');
  });

  it('parses typed rupees into integer paise', () => {
    expect(rupeesToPaise('1,499.5')).toBe(149_950);
    expect(rupeesToPaise(' ₹ 250 ')).toBe(25_000);
    expect(rupeesToPaise('0.01')).toBe(1);
    expect(rupeesToPaise('12.345')).toBeNull();
    expect(rupeesToPaise('-5')).toBeNull();
    expect(rupeesToPaise('abc')).toBeNull();
    expect(rupeesToPaise('')).toBeNull();
  });

  it('round-trips paise through the form value', () => {
    for (const paise of [1, 99, 100, 14_950, 1_000_000]) {
      expect(rupeesToPaise(paiseToRupees(paise))).toBe(paise);
    }
  });
});

describe('listingPriceText', () => {
  it('shows the product price per unit', () => {
    expect(listingPriceText(productFixture)).toBe('₹149.50 / metre');
  });

  it('says "Ask for price" when there is no price', () => {
    expect(listingPriceText({ ...productFixture, price: null })).toBe(ASK_FOR_PRICE);
    expect(listingPriceText(serviceFixture)).toBe(ASK_FOR_PRICE);
  });

  it('shows a starting price for services, with the unit when set', () => {
    const service = { ...serviceFixture, price: inr(50_000) };
    expect(listingPriceText(service)).toBe('From ₹500');
    expect(listingPriceText({ ...service, priceUnit: 'per_hour' })).toBe('From ₹500 per hour');
  });
});

describe('areaLabel', () => {
  it('names All India, or the cities then states', () => {
    expect(areaLabel(productFixture.shippingArea)).toBe('All India');
    expect(areaLabel(serviceFixture.serviceArea)).toBe('Surat, Gujarat');
    expect(areaLabel({ allIndia: false, states: [], cities: [] })).toBe('Not specified');
  });
});

describe('business details', () => {
  it('orders opening hours by weekday and joins split shifts', () => {
    expect(openingHoursLines(businessFixture.openingHours)).toEqual([
      'Mon: 09:00–13:00, 14:00–18:00',
      'Tue: 14:00–18:00',
    ]);
  });

  it('builds the address from what the owner filled in', () => {
    expect(businessAddress(businessFixture)).toBe('Ring Road, Surat, Gujarat 395002');
    expect(businessAddress({ ...businessFixture, address: null, pincode: null })).toBe(
      'Surat, Gujarat',
    );
  });

  it('makes initials for the logo fallback', () => {
    expect(initials('Sharma Textiles Surat')).toBe('ST');
    expect(initials('  ')).toBe('?');
  });
});

describe('truncate', () => {
  it('keeps short text and cuts long text at a word', () => {
    expect(truncate('  short\n text ')).toBe('short text');
    const long = 'word '.repeat(60);
    const cut = truncate(long, 50);
    expect(cut.length).toBeLessThanOrEqual(50);
    expect(cut.endsWith('word…')).toBe(true);
  });
});
