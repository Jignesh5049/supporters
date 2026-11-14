/**
 * The seam between the wallet and the money rail. The wallet code only knows this interface; the
 * real RazorpayX adapter and the fake both implement it, so everything is testable without an
 * account (backend spec, Payments and money).
 */

export type PayoutDestination =
  | { method: 'upi'; upiId: string; holderName: string }
  | { method: 'bank'; accountNumber: string; ifsc: string; holderName: string };

export interface AccountValidation {
  /** `pending`: the bank has not answered yet; a webhook or a poll completes it. */
  status: 'validated' | 'pending' | 'failed';
  /** The holder name the bank has on file. */
  registeredName: string | null;
  fundAccountId: string | null;
  validationId: string | null;
}

export type ProviderPayoutStatus =
  'queued' | 'processing' | 'processed' | 'failed' | 'reversed' | 'cancelled';

export interface ProviderPayout {
  payoutId: string;
  status: ProviderPayoutStatus;
  /** A generic reason; the provider's raw message is never shown to users. */
  failureReason: string | null;
}

export interface CreatePayoutInput {
  /** Fixed per withdrawal: sending the same key twice must create one payout. */
  idempotencyKey: string;
  amountPaise: number;
  destination: PayoutDestination;
  fundAccountId: string | null;
  /** The withdrawal id, so a payout can be traced back. */
  referenceId: string;
  narration: string;
}

export interface PayoutsProvider {
  readonly name: 'fake' | 'razorpayx';
  validateAccount(input: {
    userId: string;
    destination: PayoutDestination;
  }): Promise<AccountValidation>;
  createPayout(input: CreatePayoutInput): Promise<ProviderPayout>;
  fetchPayout(payoutId: string): Promise<ProviderPayout>;
}
