import { SAC_CODE_PLACEHOLDER } from './gst';

/** The supplier printed on every invoice: the client's company. Supplied through `INVOICE_SELLER_*`. */
export interface InvoiceSeller {
  name: string;
  gstin: string | null;
  address: string | null;
  stateCode: string | null;
  sac: string;
}

/** Development defaults. Production with Razorpay refuses to start without the real values. */
export const PLACEHOLDER_SELLER: InvoiceSeller = {
  name: 'Supporters (seller details not configured)',
  gstin: null,
  address: null,
  stateCode: null,
  sac: SAC_CODE_PLACEHOLDER,
};
