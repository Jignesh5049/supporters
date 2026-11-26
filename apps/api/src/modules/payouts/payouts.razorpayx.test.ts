import { describe, expect, it } from 'vitest';
import { RazorpayXPayouts, mapPayoutStatus, mapValidation } from './payouts.razorpayx';

/** Stubs the HTTP client: records each call and answers from a script. */
function stub(answers: Record<string, unknown>) {
  const calls: { url: string; data?: Record<string, unknown>; headers?: Record<string, string> }[] =
    [];
  const provider = new RazorpayXPayouts(
    { keyId: 'rzp_test_x', keySecret: 'secret', accountNumber: '2323230000000000' },
    (headers) => ({
      post: async ({ url, data }) => {
        calls.push({ url, data, ...(headers ? { headers } : {}) });
        return answers[url];
      },
      get: async ({ url }) => {
        calls.push({ url });
        return answers[url];
      },
    }),
  );
  return { provider, calls };
}

describe('RazorpayXPayouts', () => {
  it('validates a bank account through contact, fund account and validation', async () => {
    const { provider, calls } = stub({
      '/contacts': { id: 'cont_1' },
      '/fund_accounts': { id: 'fa_1' },
      '/fund_accounts/validations': { id: 'fav_1', status: 'created' },
    });
    const result = await provider.validateAccount({
      userId: 'u1',
      destination: {
        method: 'bank',
        accountNumber: '123456789012',
        ifsc: 'HDFC0001234',
        holderName: 'Ravi Kumar',
      },
    });
    expect(result).toEqual({
      status: 'pending',
      registeredName: null,
      fundAccountId: 'fa_1',
      validationId: 'fav_1',
    });
    expect(calls.map((c) => c.url)).toEqual([
      '/contacts',
      '/fund_accounts',
      '/fund_accounts/validations',
    ]);
    expect(calls[1]?.data).toMatchObject({ contact_id: 'cont_1', account_type: 'bank_account' });
  });

  it('uses a vpa fund account for UPI', async () => {
    const { provider, calls } = stub({
      '/contacts': { id: 'cont_1' },
      '/fund_accounts': { id: 'fa_1' },
      '/fund_accounts/validations': {
        id: 'fav_1',
        status: 'completed',
        results: { account_status: 'active', registered_name: 'RAVI KUMAR' },
      },
    });
    const result = await provider.validateAccount({
      userId: 'u1',
      destination: { method: 'upi', upiId: 'ravi@okaxis', holderName: 'Ravi Kumar' },
    });
    expect(result).toMatchObject({ status: 'validated', registeredName: 'RAVI KUMAR' });
    expect(calls[1]?.data).toMatchObject({ account_type: 'vpa', vpa: { address: 'ravi@okaxis' } });
  });

  it('sends the idempotency key as the X-Payout-Idempotency header and amounts in paise', async () => {
    const { provider, calls } = stub({ '/payouts': { id: 'pout_1', status: 'processing' } });
    const payout = await provider.createPayout({
      idempotencyKey: 'wd-1',
      amountPaise: 30_000,
      fundAccountId: 'fa_1',
      referenceId: 'wd-1',
      narration: 'Supporters wallet withdrawal payout',
      destination: { method: 'upi', upiId: 'ravi@okaxis', holderName: 'Ravi Kumar' },
    });
    expect(payout).toEqual({ payoutId: 'pout_1', status: 'processing', failureReason: null });
    expect(calls[0]?.headers).toEqual({ 'X-Payout-Idempotency': 'wd-1' });
    expect(calls[0]?.data).toMatchObject({
      amount: 30_000,
      currency: 'INR',
      mode: 'UPI',
      fund_account_id: 'fa_1',
    });
    expect(String(calls[0]?.data?.narration).length).toBeLessThanOrEqual(30);
  });

  it('refuses a payout without a fund account, and rejects malformed responses', async () => {
    const { provider } = stub({ '/payouts': { unexpected: true } });
    const base = {
      idempotencyKey: 'k',
      amountPaise: 10_000,
      referenceId: 'r',
      narration: 'n',
      destination: { method: 'upi', upiId: 'a@b', holderName: 'x y' },
    } as const;
    await expect(provider.createPayout({ ...base, fundAccountId: null })).rejects.toThrow();
    await expect(provider.createPayout({ ...base, fundAccountId: 'fa_1' })).rejects.toThrow();
  });

  it('maps provider statuses, and never passes the provider text on', () => {
    expect(mapPayoutStatus('pending')).toBe('queued');
    expect(mapPayoutStatus('rejected')).toBe('failed');
    expect(mapPayoutStatus('reversed')).toBe('reversed');
    expect(
      mapValidation({ id: 'x', status: 'completed', results: { account_status: 'invalid' } }),
    ).toBe('failed');
  });
});
