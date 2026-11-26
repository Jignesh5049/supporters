import { describe, expect, it } from 'vitest';
import { GST_STATE_CODE, financialYearOf, formatInvoiceNumber, splitInclusiveGst } from './gst';

describe('GST maths', () => {
  it('splits the GST-inclusive price into taxable value and tax that add up exactly', () => {
    expect(splitInclusiveGst(99_900, true)).toEqual({
      taxablePaise: 84_661,
      cgstPaise: 7_619,
      sgstPaise: 7_620,
      igstPaise: 0,
      ratePercent: 18,
    });
    expect(splitInclusiveGst(99_900, false)).toMatchObject({
      taxablePaise: 84_661,
      igstPaise: 15_239,
    });
    for (const total of [1, 99, 100, 101, 99_900, 118_000, 123_457]) {
      for (const intra of [true, false]) {
        const b = splitInclusiveGst(total, intra);
        expect(b.taxablePaise + b.cgstPaise + b.sgstPaise + b.igstPaise).toBe(total);
        expect(Number.isInteger(b.taxablePaise)).toBe(true);
      }
    }
  });

  it('uses the Indian financial year by the date in IST', () => {
    expect(financialYearOf(new Date('2026-04-01T00:00:00+05:30'))).toBe('2026-27');
    expect(financialYearOf(new Date('2027-03-31T23:59:59+05:30'))).toBe('2026-27');
    expect(financialYearOf(new Date('2027-04-01T00:00:00+05:30'))).toBe('2027-28');
    // 20:00 UTC on 31 March is already 1 April in India.
    expect(financialYearOf(new Date('2027-03-31T20:00:00Z'))).toBe('2027-28');
    expect(financialYearOf(new Date('2099-04-10T00:00:00Z'))).toBe('2099-00');
    expect(formatInvoiceNumber('2026-27', 123)).toBe('SUP/2026-27/000123');
  });

  it('maps the ISO state codes used by reference data to GST state codes', () => {
    expect(GST_STATE_CODE.MH).toBe('27');
    expect(GST_STATE_CODE.GJ).toBe('24');
    expect(GST_STATE_CODE.DL).toBe('07');
  });
});
