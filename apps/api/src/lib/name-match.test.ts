import { describe, expect, it } from 'vitest';
import { isNameMatch } from './name-match';

describe('isNameMatch', () => {
  it.each([
    ['Ravi Kumar', 'RAVI KUMAR'],
    ['Ravi Kumar', 'Kumar Ravi'],
    ['Ravi K', 'Ravi Kumar Sharma'],
    ['Asha Traders', 'Mrs. Asha Traders Pvt Ltd'],
    ['Priya Nair', 'Priyaa Nair'],
    ['José Álvarez', 'Jose Alvarez'],
    ['Ravi', 'Ravi Kumar'],
  ])('matches %s with %s', (a, b) => {
    expect(isNameMatch(a, b)).toBe(true);
    expect(isNameMatch(b, a)).toBe(true);
  });

  it.each([
    ['Ravi Kumar', 'Suresh Patel'],
    ['Ravi Kumar', 'Ravi Patel'],
    ['Asha Traders', 'Meena Stores'],
    ['K R', 'Ravi Kumar'],
    ['', 'Ravi Kumar'],
    ['Mr', 'Ravi Kumar'],
  ])('does not match %s with %s', (a, b) => {
    expect(isNameMatch(a, b)).toBe(false);
  });
});
