import { toE164Phone, toLoginIdentifier } from './authService';

describe('toE164Phone', () => {
  it.each([
    ['9876543210', '+919876543210'],
    ['98765 43210', '+919876543210'],
    ['+91 98765-43210', '+919876543210'],
    ['09876543210', '+919876543210'],
  ])('normalises %s', (input, expected) => {
    expect(toE164Phone(input)).toBe(expected);
  });

  it.each(['12345', '5876543210', '+1 415 555 0100', 'not a phone'])('rejects %s', (input) => {
    expect(toE164Phone(input)).toBeNull();
  });
});

describe('toLoginIdentifier', () => {
  it('accepts a mobile number or a lower-cased email', () => {
    expect(toLoginIdentifier('98765 43210')).toBe('+919876543210');
    expect(toLoginIdentifier(' Asha@Example.IN ')).toBe('asha@example.in');
    expect(toLoginIdentifier('asha@')).toBeNull();
  });
});
