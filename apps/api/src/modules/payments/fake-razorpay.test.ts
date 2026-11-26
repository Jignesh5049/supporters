import { describe, expect, it } from 'vitest';
import { FakeRazorpay, chargedEvent } from './fake-razorpay';
import { verifyWebhookSignature } from './signature';

describe('FakeRazorpay', () => {
  it('creates, cancels and refunds without any network call, refunding once per reference', async () => {
    const provider = new FakeRazorpay();
    const { id } = await provider.createSubscription({ reference: 'r1', businessId: 'b1' });
    expect(id).toMatch(/^sub_/);
    await provider.cancelSubscription(id, false);
    expect((await provider.fetchSubscription(id)).status).toBe('cancelled');
    const first = await provider.refundPayment('pay_1', 99_900, { reference: 'refund-1' });
    const again = await provider.refundPayment('pay_1', 99_900, { reference: 'refund-1' });
    expect(again).toEqual(first);
    expect(provider.refunds).toHaveLength(1);
  });

  it('fails once on demand, like a provider outage', async () => {
    const provider = new FakeRazorpay();
    provider.failNext = 'createSubscription';
    await expect(
      provider.createSubscription({ reference: 'r', businessId: 'b' }),
    ).rejects.toThrow();
    await expect(
      provider.createSubscription({ reference: 'r', businessId: 'b' }),
    ).resolves.toBeDefined();
  });

  it('builds deliveries that verify with the secret, and exposes only the public key id', () => {
    const secret = 'whsec_unit_test_0123456789abcdef';
    const delivery = chargedEvent(secret, {
      providerSubscriptionId: 'sub_1',
      providerPaymentId: 'pay_1',
      amountPaise: 99_900,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 86_400_000),
    });
    expect(verifyWebhookSignature(Buffer.from(delivery.body), delivery.signature, secret)).toBe(
      true,
    );
    expect(Object.keys(new FakeRazorpay())).not.toContain('keySecret');
  });
});
