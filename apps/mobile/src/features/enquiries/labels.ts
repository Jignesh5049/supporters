import type { Enquiry } from '@supporters/shared';
import { unitOptionLabel } from '../catalog/labels';

export { ENQUIRY_STATUS_LABEL } from '../messages/labels';

/** "500 Kg", or null when the buyer gave no quantity. */
export function enquiryQuantity(enquiry: Pick<Enquiry, 'quantity' | 'unit'>): string | null {
  if (enquiry.quantity === null) return null;
  const amount = enquiry.quantity.toLocaleString('en-IN');
  return enquiry.unit ? `${amount} ${unitOptionLabel(enquiry.unit)}` : amount;
}
