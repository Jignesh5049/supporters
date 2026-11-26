/**
 * The payment provider behind Premium. The API and worker only know this interface: `FakeRazorpay`
 * (tests and local development) and `RazorpayProvider` (the official SDK, Razorpay test mode or live)
 * implement it. Money is integer paise.
 */
export interface ProviderSubscription {
  id: string;
  /** Razorpay's own status (created, authenticated, active, pending, halted, cancelled, completed). */
  status: string;
  currentStart: Date | null;
  currentEnd: Date | null;
}

export interface PaymentsProvider {
  readonly name: 'razorpay' | 'fake';
  /** The public key id Checkout needs. Never the secret. */
  readonly keyId: string;
  createSubscription(input: {
    /** Our subscription row id, stored in the provider's notes so a support lookup can find it. */
    reference: string;
    businessId: string;
  }): Promise<{ id: string }>;
  fetchSubscription(providerSubscriptionId: string): Promise<ProviderSubscription>;
  /** `atCycleEnd`: stop renewing but keep the paid period. Otherwise cancel at once. */
  cancelSubscription(providerSubscriptionId: string, atCycleEnd: boolean): Promise<void>;
  /** The subscription a payment belongs to (a server-side fetch), or null when it is not one of ours. */
  findSubscriptionOfPayment(providerPaymentId: string): Promise<string | null>;
  /** A full or partial refund. `reference` makes a retry safe. */
  refundPayment(
    providerPaymentId: string,
    amountPaise: number,
    options: { reference: string },
  ): Promise<{ id: string }>;
}
