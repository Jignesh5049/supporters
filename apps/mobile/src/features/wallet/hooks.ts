import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PutPayoutAccountInput } from '@supporters/shared';
import { walletApi } from '../../lib/api';
import { useViewerId } from '../social/use-viewer';
import { afterConfirmation, confirmIdentity } from './guarded';

export const walletKeys = {
  all: ['wallet'] as const,
  summary: (viewer: string) => ['wallet', viewer, 'summary'] as const,
  ledger: (viewer: string) => ['wallet', viewer, 'ledger'] as const,
  withdrawals: (viewer: string) => ['wallet', viewer, 'withdrawals'] as const,
  payoutAccount: (viewer: string) => ['wallet', viewer, 'payout-account'] as const,
  referrals: (viewer: string) => ['wallet', viewer, 'referrals'] as const,
};

const paged = {
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last: { nextCursor: string | null }) => last.nextCursor ?? undefined,
};

export function useWallet() {
  const viewerId = useViewerId();
  return useQuery({
    queryKey: walletKeys.summary(viewerId ?? 'guest'),
    queryFn: () => walletApi.wallet(),
    enabled: viewerId !== null,
  });
}

export function useLedger() {
  const viewerId = useViewerId();
  return useInfiniteQuery({
    queryKey: walletKeys.ledger(viewerId ?? 'guest'),
    queryFn: ({ pageParam }) => walletApi.ledger({ cursor: pageParam }),
    enabled: viewerId !== null,
    ...paged,
  });
}

export function useWithdrawals() {
  const viewerId = useViewerId();
  return useInfiniteQuery({
    queryKey: walletKeys.withdrawals(viewerId ?? 'guest'),
    queryFn: ({ pageParam }) => walletApi.withdrawals({ cursor: pageParam }),
    enabled: viewerId !== null,
    ...paged,
  });
}

export function usePayoutAccount() {
  const viewerId = useViewerId();
  return useQuery({
    queryKey: walletKeys.payoutAccount(viewerId ?? 'guest'),
    queryFn: () => walletApi.payoutAccount(),
    enabled: viewerId !== null,
  });
}

export function useReferrals() {
  const viewerId = useViewerId();
  return useInfiniteQuery({
    queryKey: walletKeys.referrals(viewerId ?? 'guest'),
    queryFn: ({ pageParam }) => walletApi.referrals({ cursor: pageParam }),
    enabled: viewerId !== null,
    ...paged,
  });
}

/** PUT /v1/me/payout-account, only after a biometric confirmation (it starts the 24 h pause). */
export function useSavePayoutAccount(confirm = confirmIdentity) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PutPayoutAccountInput) =>
      afterConfirmation(confirm, 'Confirm your identity to change payout details', () =>
        walletApi.savePayoutAccount(input),
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: walletKeys.all }),
  });
}

/**
 * POST /v1/me/withdrawals, only after a biometric confirmation. The key is made by the screen,
 * once per intended withdrawal, and reused when the user retries after a network failure.
 */
export function useWithdraw(confirm = confirmIdentity) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, amountPaise }: { key: string; amountPaise: number }) =>
      afterConfirmation(confirm, 'Confirm your identity to withdraw money', () =>
        walletApi.withdraw(key, { amountPaise }),
      ),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: walletKeys.all }),
  });
}
