import { describe, expect, it } from 'vitest';
import { formatRupees, rupeesToPaise } from './wallet-format';

describe('formatRupees', () => {
  it('shows whole rupees without decimals and groups the Indian way', () => {
    expect(formatRupees(30_000)).toBe('₹300');
    expect(formatRupees(125_000_00)).toBe('₹1,25,000');
    expect(formatRupees(0)).toBe('₹0');
  });
  it('keeps paise when there are some', () => {
    expect(formatRupees(10_050)).toBe('₹100.50');
  });
});

describe('rupeesToPaise', () => {
  it.each([
    ['100', 10_000],
    [' 250 ', 25_000],
    ['99.5', 9_950],
    ['99.05', 9_905],
    ['0.01', 1],
  ])('reads %s as %i paise', (text, paise) => {
    expect(rupeesToPaise(text)).toBe(paise);
  });
  it.each(['', 'abc', '-5', '0', '0.00', '1.234', '1,000', '₹100', '12345678', '1e3'])(
    'refuses %j',
    (text) => {
      expect(rupeesToPaise(text)).toBeNull();
    },
  );
});
