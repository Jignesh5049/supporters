import {
  type CreateWithdrawalInput,
  type PutPayoutAccountInput,
  ledgerEntrySchema,
  pageSchema,
  payoutAccountResponseSchema,
  referralsResponseSchema,
  walletSchema,
  withdrawalSchema,
} from '@supporters/shared';
import { infiniteQueryOptions, queryOptions } from '@tanstack/react-query';
import { api } from '@/lib/api/client';

/**
 * Browser calls for referrals, the wallet and withdrawals. Every response is validated with the
 * shared schema, and the API scopes each call to the signed-in user (no route takes a user id).
 */

const ledgerPage = pageSchema(ledgerEntrySchema);
const withdrawalPage = pageSchema(withdrawalSchema);

const withCursor = (path: `/v1/${string}`, cursor?: string) =>
  (cursor ? `${path}?cursor=${encodeURIComponent(cursor)}` : path) as `/v1/${string}`;

export const walletApi = {
  referrals: async (cursor?: string) =>
    referralsResponseSchema.parse(await api.request(withCursor('/v1/me/referrals', cursor))),
  wallet: async () => walletSchema.parse(await api.request('/v1/me/wallet')),
  ledger: async (cursor?: string) =>
    ledgerPage.parse(await api.request(withCursor('/v1/me/wallet/ledger', cursor))),
  payoutAccount: async () =>
    payoutAccountResponseSchema.parse(await api.request('/v1/me/payout-account')).account,
  savePayoutAccount: async (body: PutPayoutAccountInput) =>
    payoutAccountResponseSchema.parse(
      await api.request('/v1/me/payout-account', { method: 'PUT', body }),
    ).account,
  withdrawals: async (cursor?: string) =>
    withdrawalPage.parse(await api.request(withCursor('/v1/me/withdrawals', cursor))),
  /** One Idempotency-Key per withdrawal attempt: a retry returns the stored request, never a second. */
  withdraw: async (idempotencyKey: string, body: CreateWithdrawalInput) =>
    withdrawalSchema.parse(
      await api.request('/v1/me/withdrawals', {
        method: 'POST',
        body,
        headers: { 'idempotency-key': idempotencyKey },
      }),
    ),
};

export const walletKeys = {
  all: ['wallet'] as const,
  wallet: ['wallet', 'summary'] as const,
  ledger: ['wallet', 'ledger'] as const,
  withdrawals: ['wallet', 'withdrawals'] as const,
  payoutAccount: ['wallet', 'payout-account'] as const,
  referrals: ['wallet', 'referrals'] as const,
};

export const walletQueryOptions = queryOptions({
  queryKey: walletKeys.wallet,
  queryFn: walletApi.wallet,
});

export const payoutAccountQueryOptions = queryOptions({
  queryKey: walletKeys.payoutAccount,
  queryFn: walletApi.payoutAccount,
});

export const ledgerQueryOptions = infiniteQueryOptions({
  queryKey: walletKeys.ledger,
  queryFn: ({ pageParam }) => walletApi.ledger(pageParam),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last) => last.nextCursor ?? undefined,
});

export const withdrawalsQueryOptions = infiniteQueryOptions({
  queryKey: walletKeys.withdrawals,
  queryFn: ({ pageParam }) => walletApi.withdrawals(pageParam),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last) => last.nextCursor ?? undefined,
});

export const referralsQueryOptions = infiniteQueryOptions({
  queryKey: walletKeys.referrals,
  queryFn: ({ pageParam }) => walletApi.referrals(pageParam),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last) => last.nextCursor ?? undefined,
});
