import {
  ledgerEntrySchema,
  pageSchema,
  payoutAccountResponseSchema,
  referralsResponseSchema,
  walletSchema,
  withdrawalSchema,
  createWithdrawalSchema,
  putPayoutAccountSchema,
  type CreateWithdrawalInput,
  type LedgerEntry,
  type Page,
  type PayoutAccount,
  type PutPayoutAccountInput,
  type ReferralsResponse,
  type Wallet,
  type Withdrawal,
} from '@supporters/shared';
import { z } from 'zod';
import type { ApiClient } from './client';
import { toQueryString } from './query-string';

export interface WalletApi {
  referrals(query?: { cursor?: string }): Promise<ReferralsResponse>;
  wallet(): Promise<Wallet>;
  ledger(query?: { cursor?: string }): Promise<Page<LedgerEntry>>;
  payoutAccount(): Promise<PayoutAccount | null>;
  savePayoutAccount(input: PutPayoutAccountInput): Promise<PayoutAccount | null>;
  withdrawals(query?: { cursor?: string }): Promise<Page<Withdrawal>>;
  /** `idempotencyKey` is made once per intended withdrawal and reused on a retry. */
  withdraw(idempotencyKey: string, input: CreateWithdrawalInput): Promise<Withdrawal>;
}

/** Referrals, the wallet, the payout account and withdrawals. Every call is scoped to the signed-in user. */
export function createWalletApi(client: ApiClient): WalletApi {
  return {
    referrals: (query = {}) =>
      client.request(`/me/referrals${toQueryString({ ...query })}`, {
        schema: referralsResponseSchema,
      }),
    wallet: () => client.request('/me/wallet', { schema: walletSchema }),
    ledger: (query = {}) =>
      client.request(`/me/wallet/ledger${toQueryString({ ...query })}`, {
        schema: pageSchema(ledgerEntrySchema),
      }),
    payoutAccount: async () =>
      (await client.request('/me/payout-account', { schema: payoutAccountResponseSchema })).account,
    savePayoutAccount: async (input) =>
      (
        await client.request('/me/payout-account', {
          method: 'PUT',
          body: putPayoutAccountSchema.parse(input),
          schema: payoutAccountResponseSchema,
        })
      ).account,
    withdrawals: (query = {}) =>
      client.request(`/me/withdrawals${toQueryString({ ...query })}`, {
        schema: pageSchema(withdrawalSchema),
      }),
    withdraw: (idempotencyKey, input) =>
      client.request('/me/withdrawals', {
        method: 'POST',
        headers: { 'Idempotency-Key': z.uuid().parse(idempotencyKey) },
        body: createWithdrawalSchema.parse(input),
        schema: withdrawalSchema,
      }),
  };
}
