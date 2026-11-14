import type { Env } from '../../config/env';
import { SAC_CODE_PLACEHOLDER } from './gst';
import { FakeRazorpay } from './fake-razorpay';
import { type InvoiceSeller, PLACEHOLDER_SELLER } from './invoice-seller';
import type { PaymentsProvider } from './provider';
import { RazorpayProvider } from './razorpay.provider';

/** `none` boots the app without payments: Premium endpoints answer 503 PAYMENTS_NOT_CONFIGURED. */
export function createPaymentsProvider(
  env: Pick<
    Env,
    'PAYMENTS_PROVIDER' | 'RAZORPAY_KEY_ID' | 'RAZORPAY_KEY_SECRET' | 'RAZORPAY_PLAN_ID'
  >,
): PaymentsProvider | null {
  switch (env.PAYMENTS_PROVIDER) {
    case 'fake':
      return new FakeRazorpay();
    case 'razorpay':
      // Env validation already required all three.
      return new RazorpayProvider(
        env.RAZORPAY_KEY_ID ?? '',
        env.RAZORPAY_KEY_SECRET ?? '',
        env.RAZORPAY_PLAN_ID ?? '',
      );
    case 'none':
      return null;
  }
}

export const invoiceSellerFromEnv = (
  env: Pick<
    Env,
    | 'INVOICE_SELLER_NAME'
    | 'INVOICE_SELLER_GSTIN'
    | 'INVOICE_SELLER_ADDRESS'
    | 'INVOICE_SELLER_STATE_CODE'
    | 'INVOICE_SAC_CODE'
  >,
): InvoiceSeller => ({
  name: env.INVOICE_SELLER_NAME ?? PLACEHOLDER_SELLER.name,
  gstin: env.INVOICE_SELLER_GSTIN ?? null,
  address: env.INVOICE_SELLER_ADDRESS ?? null,
  stateCode: env.INVOICE_SELLER_STATE_CODE ?? null,
  sac: env.INVOICE_SAC_CODE ?? SAC_CODE_PLACEHOLDER,
});
