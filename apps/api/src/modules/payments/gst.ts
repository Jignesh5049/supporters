import { PREMIUM } from '@supporters/shared';

/** GST state code (two digits) for the ISO 3166-2:IN code stored on `states`. */
export const GST_STATE_CODE: Readonly<Record<string, string>> = {
  JK: '01',
  HP: '02',
  PB: '03',
  CH: '04',
  UK: '05',
  HR: '06',
  DL: '07',
  RJ: '08',
  UP: '09',
  BR: '10',
  SK: '11',
  AR: '12',
  NL: '13',
  MN: '14',
  MZ: '15',
  TR: '16',
  ML: '17',
  AS: '18',
  WB: '19',
  JH: '20',
  OD: '21',
  CG: '22',
  MP: '23',
  GJ: '24',
  DH: '26',
  DN: '26',
  DD: '26',
  MH: '27',
  KA: '29',
  GA: '30',
  LD: '31',
  KL: '32',
  TN: '33',
  PY: '34',
  AN: '35',
  TS: '36',
  AP: '37',
  LA: '38',
};

/**
 * Placeholder service accounting code. NEEDS THE CLIENT'S ACCOUNTANT: the correct SAC (and whether
 * 18% applies) for an online business-listing subscription must be confirmed. Override with
 * `INVOICE_SAC_CODE`; production refuses to start with Razorpay unless it is set.
 */
export const SAC_CODE_PLACEHOLDER = '998439';

export interface GstBreakup {
  /** Price before tax. */
  taxablePaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  ratePercent: number;
}

/**
 * Splits a GST-inclusive total into taxable value and tax, in integer paise. The taxable value is
 * rounded to the nearest paisa and the tax is the remainder, so the parts always add up to the total.
 * Same state: CGST and SGST each take half (the odd paisa goes to SGST); otherwise IGST.
 */
export function splitInclusiveGst(
  totalPaise: number,
  isIntraState: boolean,
  ratePercent: number = PREMIUM.gstRatePercent,
): GstBreakup {
  const taxablePaise = Math.round((totalPaise * 100) / (100 + ratePercent));
  const taxPaise = totalPaise - taxablePaise;
  if (!isIntraState) {
    return { taxablePaise, cgstPaise: 0, sgstPaise: 0, igstPaise: taxPaise, ratePercent };
  }
  const cgstPaise = Math.floor(taxPaise / 2);
  return { taxablePaise, cgstPaise, sgstPaise: taxPaise - cgstPaise, igstPaise: 0, ratePercent };
}

/** The Indian financial year (April to March, by the date in IST), e.g. `2026-27`. */
export function financialYearOf(date: Date): string {
  const ist = new Date(date.getTime() + 5.5 * 3_600_000);
  const year = ist.getUTCFullYear();
  const start = ist.getUTCMonth() >= 3 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

export const formatInvoiceNumber = (financialYear: string, sequence: number) =>
  `SUP/${financialYear}/${String(sequence).padStart(6, '0')}`;
