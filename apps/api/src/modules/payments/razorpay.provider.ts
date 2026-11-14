import Razorpay from 'razorpay';
import type { PaymentsProvider, ProviderSubscription } from './provider';

/** The plan is yearly, so 10 cycles is up to 10 years of auto-renewal. */
const TOTAL_COUNT = 10;

const toDate = (seconds: unknown): Date | null =>
  typeof seconds === 'number' && seconds > 0 ? new Date(seconds * 1000) : null;

/**
 * The thin adapter over the official `razorpay` SDK. It works in Razorpay test mode with `rzp_test_`
 * keys. Tests never use it: `FakeRazorpay` stands in. Response shapes follow Razorpay's API docs and
 * must be checked once against a real test-mode account (the client's KYC is pending).
 */
export class RazorpayProvider implements PaymentsProvider {
  readonly name = 'razorpay' as const;
  private readonly client: Razorpay;

  constructor(
    readonly keyId: string,
    keySecret: string,
    private readonly planId: string,
  ) {
    this.client = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async createSubscription(input: { reference: string; businessId: string }) {
    const created = await this.client.subscriptions.create({
      plan_id: this.planId,
      total_count: TOTAL_COUNT,
      customer_notify: true,
      notes: { subscription_ref: input.reference, business_id: input.businessId },
    });
    return { id: created.id };
  }

  async fetchSubscription(id: string): Promise<ProviderSubscription> {
    const subscription = await this.client.subscriptions.fetch(id);
    return {
      id: subscription.id,
      status: subscription.status,
      currentStart: toDate(subscription.current_start),
      currentEnd: toDate(subscription.current_end),
    };
  }

  async cancelSubscription(id: string, atCycleEnd: boolean) {
    await this.client.subscriptions.cancel(id, atCycleEnd);
  }

  /** A subscription charge is a payment on an invoice that names the subscription. */
  async findSubscriptionOfPayment(paymentId: string) {
    const payment: { invoice_id?: unknown } = await this.client.payments.fetch(paymentId);
    if (typeof payment.invoice_id !== 'string') return null;
    const invoice = (await this.client.invoices.fetch(payment.invoice_id)) as unknown as {
      subscription_id?: unknown;
    };
    return typeof invoice.subscription_id === 'string' ? invoice.subscription_id : null;
  }

  async refundPayment(paymentId: string, amountPaise: number, options: { reference: string }) {
    const refund = await this.client.payments.refund(paymentId, {
      amount: amountPaise,
      speed: 'normal',
      receipt: options.reference.slice(0, 40),
      notes: { reference: options.reference },
    });
    return { id: refund.id };
  }
}
