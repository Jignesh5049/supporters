import { createWalletApi } from '../../lib/api/wallet';
import type { ApiClient } from '../../lib/api/client';
import { ConfirmationCancelledError, afterConfirmation } from './guarded';
import {
  EMPTY_PAYOUT_FORM,
  formatRupees,
  parsePayoutForm,
  rupeesToPaise,
  type PayoutFormValues,
} from './format';

describe('formatRupees and rupeesToPaise', () => {
  it('shows whole rupees without decimals, grouped the Indian way', () => {
    expect(formatRupees(30_000)).toBe('₹300');
    expect(formatRupees(12_500_000)).toBe('₹1,25,000');
    expect(formatRupees(10_050)).toBe('₹100.50');
  });

  it.each([
    ['100', 10_000],
    ['99.5', 9_950],
    ['99.05', 9_905],
  ])('reads %s as %i paise', (text, paise) => {
    expect(rupeesToPaise(text)).toBe(paise);
  });

  it.each(['', '0', '-5', '1.234', '1,000', '₹100', '1e3', '12345678'])('refuses %j', (text) => {
    expect(rupeesToPaise(text)).toBeNull();
  });
});

describe('parsePayoutForm', () => {
  const bank: PayoutFormValues = {
    ...EMPTY_PAYOUT_FORM,
    method: 'bank',
    holderName: 'Ravi Kumar',
    accountNumber: '123456789012',
    confirmAccountNumber: '123456789012',
    ifsc: 'hdfc0001234',
    upiId: 'ignored@upi',
  };

  it('sends only the chosen method, normalised by the shared schema', () => {
    expect(parsePayoutForm(bank)).toEqual({
      ok: true,
      data: {
        method: 'bank',
        accountNumber: '123456789012',
        ifsc: 'HDFC0001234',
        holderName: 'Ravi Kumar',
      },
    });
  });

  it('asks for the account number twice and checks the shapes', () => {
    const mismatch = parsePayoutForm({ ...bank, confirmAccountNumber: '123456789013' });
    expect(mismatch.ok).toBe(false);
    expect(parsePayoutForm({ ...bank, ifsc: 'BAD' }).ok).toBe(false);
    expect(parsePayoutForm({ ...EMPTY_PAYOUT_FORM, holderName: 'Ravi', upiId: 'nope' }).ok).toBe(
      false,
    );
  });
});

describe('afterConfirmation (biometric gate)', () => {
  it('never sends the request when the prompt is dismissed or fails', async () => {
    const action = jest.fn().mockResolvedValue('sent');
    await expect(afterConfirmation(async () => false, 'Confirm', action)).rejects.toBeInstanceOf(
      ConfirmationCancelledError,
    );
    expect(action).not.toHaveBeenCalled();
  });

  it('sends it once the user confirms, after asking with the prompt text', async () => {
    const action = jest.fn().mockResolvedValue('sent');
    const confirm = jest.fn().mockResolvedValue(true);
    await expect(afterConfirmation(confirm, 'Confirm to withdraw', action)).resolves.toBe('sent');
    expect(confirm).toHaveBeenCalledWith('Confirm to withdraw');
    expect(confirm.mock.invocationCallOrder[0]).toBeLessThan(
      action.mock.invocationCallOrder[0] ?? 0,
    );
  });
});

describe('wallet API client', () => {
  const KEY = '0b100000-0000-4000-8000-000000000001';
  const entry = {
    id: '0a100000-0000-4000-8000-000000000002',
    amount: { amountPaise: 10_000, currency: 'INR' },
    status: 'pending',
    method: 'upi',
    maskedDestination: 'ra••••@okaxis',
    reason: null,
    createdAt: '2027-01-10T10:00:00.000Z',
    completedAt: null,
  };

  function fakeClient(response: unknown) {
    const request = jest
      .fn()
      .mockImplementation(
        async (_path: string, options?: { schema?: { parse: (v: unknown) => unknown } }) =>
          options?.schema ? options.schema.parse(response) : response,
      );
    return { client: { request } as unknown as ApiClient, request };
  }

  it('sends the withdrawal with an Idempotency-Key header and validates the body', async () => {
    const { client, request } = fakeClient(entry);
    const api = createWalletApi(client);
    await api.withdraw(KEY, { amountPaise: 10_000 });
    expect(request).toHaveBeenCalledWith(
      '/me/withdrawals',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Idempotency-Key': KEY },
        body: { amountPaise: 10_000 },
      }),
    );
  });

  it('refuses a malformed key or amount before anything is sent', async () => {
    const { client, request } = fakeClient(entry);
    const api = createWalletApi(client);
    expect(() => api.withdraw('not-a-uuid', { amountPaise: 10_000 })).toThrow();
    expect(() => api.withdraw(KEY, { amountPaise: 100.5 })).toThrow();
    expect(() => api.withdraw(KEY, { amountPaise: -1 })).toThrow();
    expect(request).not.toHaveBeenCalled();
  });

  it('returns null when there is no payout account yet', async () => {
    const { client } = fakeClient({ account: null });
    await expect(createWalletApi(client).payoutAccount()).resolves.toBeNull();
  });
});
