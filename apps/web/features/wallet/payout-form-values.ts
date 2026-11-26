import {
  type PayoutMethod,
  type PutPayoutAccountInput,
  putPayoutAccountSchema,
} from '@supporters/shared';

export interface PayoutFormValues {
  method: PayoutMethod;
  holderName: string;
  upiId: string;
  accountNumber: string;
  confirmAccountNumber: string;
  ifsc: string;
}

export const EMPTY_PAYOUT_FORM: PayoutFormValues = {
  method: 'upi',
  holderName: '',
  upiId: '',
  accountNumber: '',
  confirmAccountNumber: '',
  ifsc: '',
};

export type PayoutFormErrors = Partial<Record<keyof PayoutFormValues, string>>;

export type PayoutFormResult =
  { ok: true; data: PutPayoutAccountInput } | { ok: false; errors: PayoutFormErrors };

/**
 * Checks the form with the API's own schema (so the two can never disagree) plus the one rule that
 * is only a typing aid: the account number is typed twice. Only the fields of the chosen method
 * are sent.
 */
export function parsePayoutForm(values: PayoutFormValues): PayoutFormResult {
  const candidate =
    values.method === 'upi'
      ? { method: 'upi', upiId: values.upiId, holderName: values.holderName }
      : {
          method: 'bank',
          accountNumber: values.accountNumber,
          ifsc: values.ifsc,
          holderName: values.holderName,
        };
  const parsed = putPayoutAccountSchema.safeParse(candidate);
  const errors: PayoutFormErrors = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? '') as keyof PayoutFormValues;
      if (field in values && !errors[field]) errors[field] = issue.message;
    }
    if (errors.holderName) errors.holderName = 'Enter the name on the account';
  }
  if (
    values.method === 'bank' &&
    values.accountNumber.trim() !== values.confirmAccountNumber.trim()
  ) {
    errors.confirmAccountNumber = 'The account numbers do not match';
  }
  if (!parsed.success || Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: parsed.data };
}
