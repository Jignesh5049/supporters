import { randomUUID } from 'node:crypto';
import type {
  AccountValidation,
  CreatePayoutInput,
  PayoutDestination,
  PayoutsProvider,
  ProviderPayout,
  ProviderPayoutStatus,
} from './payouts.provider';

/**
 * An in-memory payout rail for tests and local development. It never moves money. It honours the
 * idempotency key the way RazorpayX does (the same key returns the same payout), and tests can
 * script outcomes.
 */
export class FakePayouts implements PayoutsProvider {
  readonly name = 'fake' as const;
  /** Every createPayout call, including repeats (a repeat returns the first payout). */
  readonly createCalls: CreatePayoutInput[] = [];
  readonly payouts = new Map<string, ProviderPayout & { input: CreatePayoutInput }>();
  private readonly byKey = new Map<string, string>();

  /** Decides how an account validates; default: validated, registered name as typed. */
  validation: (
    destination: PayoutDestination,
  ) => Omit<AccountValidation, 'fundAccountId' | 'validationId'> = (destination) => ({
    status: 'validated',
    registeredName: destination.holderName,
  });
  /** The status a new payout starts in. */
  initialStatus: ProviderPayoutStatus = 'processing';
  /** Throw from createPayout (a network error), to test retries. */
  failNextCreate: Error | null = null;

  async validateAccount(input: { userId: string; destination: PayoutDestination }) {
    return {
      ...this.validation(input.destination),
      fundAccountId: `fa_${randomUUID().slice(0, 14)}`,
      validationId: `fav_${randomUUID().slice(0, 14)}`,
    };
  }

  async createPayout(input: CreatePayoutInput): Promise<ProviderPayout> {
    this.createCalls.push(input);
    if (this.failNextCreate) {
      const error = this.failNextCreate;
      this.failNextCreate = null;
      throw error;
    }
    const existingId = this.byKey.get(input.idempotencyKey);
    const existing = existingId ? this.payouts.get(existingId) : undefined;
    if (existing)
      return {
        payoutId: existing.payoutId,
        status: existing.status,
        failureReason: existing.failureReason,
      };
    const payout = {
      payoutId: `pout_${randomUUID().slice(0, 14)}`,
      status: this.initialStatus,
      failureReason: null,
    };
    this.payouts.set(payout.payoutId, { ...payout, input });
    this.byKey.set(input.idempotencyKey, payout.payoutId);
    return payout;
  }

  async fetchPayout(payoutId: string): Promise<ProviderPayout> {
    const payout = this.payouts.get(payoutId);
    if (!payout) throw new Error(`unknown payout ${payoutId}`);
    return { payoutId, status: payout.status, failureReason: payout.failureReason };
  }

  /** Test control: move a payout to a final state. */
  settle(payoutId: string, status: ProviderPayoutStatus, failureReason: string | null = null) {
    const payout = this.payouts.get(payoutId);
    if (!payout) throw new Error(`unknown payout ${payoutId}`);
    payout.status = status;
    payout.failureReason = failureReason;
  }
}
