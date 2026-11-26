import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionStatus, useSessionStore } from '../../stores/session-store';
import { ConfirmationCancelledError } from './guarded';
import { useSavePayoutAccount, useWallet, useWithdraw } from './hooks';

const mockWalletApi = {
  wallet: jest.fn(),
  withdraw: jest.fn(),
  savePayoutAccount: jest.fn(),
};
jest.mock('../../lib/api', () => ({
  get walletApi() {
    return mockWalletApi;
  },
}));

const KEY = '0b100000-0000-4000-8000-000000000001';

let client: QueryClient;
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } });
});
afterEach(() => {
  jest.clearAllMocks();
  client.clear();
  useSessionStore.setState({ status: SessionStatus.Restoring, user: null });
});

describe('wallet hooks', () => {
  it('load nothing for guests', async () => {
    useSessionStore.getState().setGuest();
    await renderHook(() => useWallet(), { wrapper });
    expect(mockWalletApi.wallet).not.toHaveBeenCalled();
  });

  it('withdraw does not call the API when the biometric prompt fails', async () => {
    const confirm = jest.fn().mockResolvedValue(false);
    const { result } = await renderHook(() => useWithdraw(confirm), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ key: KEY, amountPaise: 10_000 }).catch(() => undefined);
    });
    expect(confirm).toHaveBeenCalledWith('Confirm your identity to withdraw money');
    expect(mockWalletApi.withdraw).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current.error).toBeInstanceOf(ConfirmationCancelledError));
  });

  it('withdraw sends the key and amount after the user confirms', async () => {
    mockWalletApi.withdraw.mockResolvedValue({ id: 'w1' });
    const { result } = await renderHook(() => useWithdraw(async () => true), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ key: KEY, amountPaise: 25_000 });
    });
    expect(mockWalletApi.withdraw).toHaveBeenCalledWith(KEY, { amountPaise: 25_000 });
  });

  it('changing payout details needs the biometric confirmation too', async () => {
    const input = { method: 'upi', upiId: 'ravi@okaxis', holderName: 'Ravi Kumar' } as const;
    const refused = await renderHook(() => useSavePayoutAccount(async () => false), { wrapper });
    await act(async () => {
      await refused.result.current.mutateAsync(input).catch(() => undefined);
    });
    expect(mockWalletApi.savePayoutAccount).not.toHaveBeenCalled();

    mockWalletApi.savePayoutAccount.mockResolvedValue({});
    const allowed = await renderHook(() => useSavePayoutAccount(async () => true), { wrapper });
    await act(async () => {
      await allowed.result.current.mutateAsync(input);
    });
    expect(mockWalletApi.savePayoutAccount).toHaveBeenCalledWith(input);
  });
});
