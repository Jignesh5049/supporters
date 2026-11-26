import React from 'react';
import { render } from '@testing-library/react-native';
import { ReferralScreen } from './ReferralScreen';
import { WalletScreen } from './WalletScreen';
import { WithdrawalHistoryScreen } from './WithdrawalHistoryScreen';
import { WithdrawalScreen } from './WithdrawalScreen';

const mockSecure = jest.fn();
jest.mock('../hooks/useScreenSecurity', () => ({
  useScreenSecurity: () => mockSecure(),
}));
jest.mock('../context/AppContext', () => ({ useApp: () => ({ navigate: jest.fn() }) }));
jest.mock('../lib/api', () => ({
  ApiError: class ApiError extends Error {},
  messageForError: () => 'error',
}));

jest.mock('../features/wallet/hooks', () => {
  const state = { isPending: true, isError: false, data: undefined, error: null };
  const idle = {
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    error: null,
    reset: jest.fn(),
  };
  return {
    useWallet: () => state,
    useLedger: () => state,
    useWithdrawals: () => state,
    usePayoutAccount: () => state,
    useReferrals: () => state,
    useSavePayoutAccount: () => idle,
    useWithdraw: () => idle,
  };
});

describe('money screens', () => {
  beforeEach(() => mockSecure.mockClear());

  it.each([
    ['WalletScreen', WalletScreen],
    ['WithdrawalScreen', WithdrawalScreen],
    ['WithdrawalHistoryScreen', WithdrawalHistoryScreen],
    ['ReferralScreen', ReferralScreen],
  ])('%s blocks screenshots and screen recording (FLAG_SECURE)', async (_name, Screen) => {
    await render(<Screen />);
    expect(mockSecure).toHaveBeenCalled();
  });
});
