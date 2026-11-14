import Razorpay from 'razorpay';
import { z } from 'zod';
import type {
  AccountValidation,
  CreatePayoutInput,
  PayoutDestination,
  PayoutsProvider,
  ProviderPayout,
  ProviderPayoutStatus,
} from './payouts.provider';

/**
 * The real RazorpayX adapter, on the official `razorpay` SDK's HTTP client. The SDK has no typed
 * resources for RazorpayX (contacts, fund accounts, validations, payouts), so this calls its REST
 * endpoints through `api.get/post`, and validates every response with Zod (backend spec, API10).
 *
 * NOT YET EXERCISED AGAINST A LIVE ACCOUNT: the client has not opened RazorpayX. It is written
 * from the public RazorpayX API reference and tested against a stubbed HTTP client only. Before
 * go-live, run it once in RazorpayX test mode (see the PR description checklist).
 */

interface HttpClient {
  get: (params: { url: string; qs?: Record<string, unknown> }) => Promise<unknown>;
  post: (params: { url: string; data: Record<string, unknown> }) => Promise<unknown>;
}

export interface RazorpayXConfig {
  keyId: string;
  keySecret: string;
  /** The RazorpayX current account that pays out. */
  accountNumber: string;
}

const idOnly = z.object({ id: z.string().min(1) });
const validationResult = z.object({
  id: z.string(),
  status: z.enum(['created', 'completed', 'failed']),
  results: z
    .object({
      account_status: z.string().nullish(),
      registered_name: z.string().nullish(),
    })
    .nullish(),
});
const payoutResult = z.object({
  id: z.string(),
  status: z.enum([
    'queued',
    'pending',
    'processing',
    'processed',
    'reversed',
    'cancelled',
    'rejected',
    'failed',
  ]),
  status_details: z.object({ description: z.string().nullish() }).nullish(),
});

export function mapPayoutStatus(
  status: z.infer<typeof payoutResult>['status'],
): ProviderPayoutStatus {
  switch (status) {
    case 'queued':
    case 'pending':
      return 'queued';
    case 'processing':
      return 'processing';
    case 'processed':
      return 'processed';
    case 'reversed':
      return 'reversed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'failed';
  }
}

/** RazorpayX `validation` status to ours. Only an active account with a name counts. */
export function mapValidation(
  result: z.infer<typeof validationResult>,
): AccountValidation['status'] {
  if (result.status === 'created') return 'pending';
  if (result.status === 'failed') return 'failed';
  return result.results?.account_status === 'active' ? 'validated' : 'failed';
}

export class RazorpayXPayouts implements PayoutsProvider {
  readonly name = 'razorpayx' as const;

  constructor(
    private readonly config: RazorpayXConfig,
    /** Tests inject a stub; production builds the SDK client. */
    private readonly client: (headers?: Record<string, string>) => HttpClient = (headers) =>
      new Razorpay({
        key_id: config.keyId,
        key_secret: config.keySecret,
        // The SDK types its headers narrowly; X-Payout-Idempotency is a documented RazorpayX header.
        ...(headers ? { headers } : {}),
      }).api,
  ) {}

  private destinationBody(destination: PayoutDestination) {
    return destination.method === 'upi'
      ? { account_type: 'vpa', vpa: { address: destination.upiId } }
      : {
          account_type: 'bank_account',
          bank_account: {
            name: destination.holderName,
            ifsc: destination.ifsc,
            account_number: destination.accountNumber,
          },
        };
  }

  async validateAccount(input: { userId: string; destination: PayoutDestination }) {
    const http = this.client();
    // The contact carries our user id (opaque), never contact details.
    const contact = idOnly.parse(
      await http.post({
        url: '/contacts',
        data: { name: input.destination.holderName, type: 'customer', reference_id: input.userId },
      }),
    );
    const fundAccount = idOnly.parse(
      await http.post({
        url: '/fund_accounts',
        data: { contact_id: contact.id, ...this.destinationBody(input.destination) },
      }),
    );
    const validation = validationResult.parse(
      await http.post({
        url: '/fund_accounts/validations',
        data: {
          account_number: this.config.accountNumber,
          fund_account: { id: fundAccount.id },
          amount: 100,
          currency: 'INR',
        },
      }),
    );
    return {
      status: mapValidation(validation),
      registeredName: validation.results?.registered_name ?? null,
      fundAccountId: fundAccount.id,
      validationId: validation.id,
    };
  }

  async createPayout(input: CreatePayoutInput): Promise<ProviderPayout> {
    if (!input.fundAccountId) throw new Error('payout needs a validated fund account');
    // One client per call: the idempotency key is a header, and the SDK fixes headers per client.
    const http = this.client({ 'X-Payout-Idempotency': input.idempotencyKey });
    const result = payoutResult.parse(
      await http.post({
        url: '/payouts',
        data: {
          account_number: this.config.accountNumber,
          fund_account_id: input.fundAccountId,
          amount: input.amountPaise,
          currency: 'INR',
          mode: input.destination.method === 'upi' ? 'UPI' : 'IMPS',
          purpose: 'payout',
          queue_if_low_balance: false,
          reference_id: input.referenceId,
          narration: input.narration.slice(0, 30),
        },
      }),
    );
    return toPayout(result);
  }

  async fetchPayout(payoutId: string): Promise<ProviderPayout> {
    const result = payoutResult.parse(
      await this.client().get({ url: `/payouts/${encodeURIComponent(payoutId)}` }),
    );
    return toPayout(result);
  }
}

const toPayout = (result: z.infer<typeof payoutResult>): ProviderPayout => ({
  payoutId: result.id,
  status: mapPayoutStatus(result.status),
  // The provider's wording is kept out of user-facing text.
  failureReason: ['failed', 'rejected', 'reversed', 'cancelled'].includes(result.status)
    ? 'The bank could not complete the payout'
    : null,
});
