import { describe, expect, it } from 'vitest';
import { EMPTY_PAYOUT_FORM, type PayoutFormValues, parsePayoutForm } from './payout-form-values';

const upi: PayoutFormValues = {
  ...EMPTY_PAYOUT_FORM,
  method: 'upi',
  holderName: 'Ravi Kumar',
  upiId: ' Ravi.Kumar@OkAxis ',
};
const bank: PayoutFormValues = {
  ...EMPTY_PAYOUT_FORM,
  method: 'bank',
  holderName: 'Ravi Kumar',
  accountNumber: '123456789012',
  confirmAccountNumber: '123456789012',
  ifsc: 'hdfc0001234',
};

describe('parsePayoutForm', () => {
  it('sends only the fields of the chosen method, normalised by the shared schema', () => {
    expect(parsePayoutForm(upi)).toEqual({
      ok: true,
      data: { method: 'upi', upiId: 'ravi.kumar@okaxis', holderName: 'Ravi Kumar' },
    });
    expect(parsePayoutForm({ ...bank, upiId: 'ignored@upi' })).toEqual({
      ok: true,
      data: {
        method: 'bank',
        accountNumber: '123456789012',
        ifsc: 'HDFC0001234',
        holderName: 'Ravi Kumar',
      },
    });
  });

  it('flags each bad field with a message', () => {
    const result = parsePayoutForm({ ...upi, upiId: 'nope', holderName: '' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.upiId).toBeTruthy();
      expect(result.errors.holderName).toBe('Enter the name on the account');
    }
  });

  it('checks the account number twice, the IFSC shape and the length', () => {
    const mismatch = parsePayoutForm({ ...bank, confirmAccountNumber: '123456789013' });
    expect(mismatch.ok).toBe(false);
    if (!mismatch.ok) expect(mismatch.errors.confirmAccountNumber).toMatch(/do not match/);
    for (const patch of [{ ifsc: 'BAD' }, { accountNumber: '12', confirmAccountNumber: '12' }]) {
      expect(parsePayoutForm({ ...bank, ...patch }).ok).toBe(false);
    }
  });
});
