import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionStatus, useSessionStore } from '../../stores/session-store';
import {
  useMatchedRequirements,
  useMyRequirements,
  usePinnedRequirement,
  useSendQuote,
} from './hooks';

const mockRequirementsApi = {
  matched: jest.fn(),
  mine: jest.fn(),
  quote: jest.fn(),
};
jest.mock('../../lib/api', () => ({
  get requirementsApi() {
    return mockRequirementsApi;
  },
}));

const ID = '0a100000-0000-4000-8000-000000000001';
const KEY = '0b100000-0000-4000-8000-000000000001';

let client: QueryClient;
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const signedIn = () =>
  useSessionStore.getState().setSignedIn({
    id: '0c100000-0000-4000-8000-000000000001',
    name: 'Asha',
    phone: '+919876543210',
    email: null,
    emailVerified: false,
    role: 'user',
    cityId: null,
    createdAt: '2026-10-30T10:00:00.000Z',
  });

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } });
});

afterEach(() => {
  jest.clearAllMocks();
  client.clear();
  useSessionStore.setState({ status: SessionStatus.Restoring, user: null });
});

describe('requirement hooks', () => {
  it('load nothing for guests', async () => {
    useSessionStore.getState().setGuest();
    await renderHook(() => useMatchedRequirements(), { wrapper });
    await renderHook(() => usePinnedRequirement(true), { wrapper });
    expect(mockRequirementsApi.matched).not.toHaveBeenCalled();
  });

  it('pages the matched list with the cursor', async () => {
    signedIn();
    mockRequirementsApi.matched.mockImplementation(async ({ cursor }: { cursor?: string }) =>
      cursor === 'next'
        ? { data: [{ id: 'b' }], nextCursor: null }
        : { data: [{ id: 'a' }], nextCursor: 'next' },
    );
    const { result } = await renderHook(() => useMatchedRequirements(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(mockRequirementsApi.matched).toHaveBeenLastCalledWith({ cursor: 'next' });
  });

  it('pins the newest matched requirement only when the user has a business', async () => {
    signedIn();
    mockRequirementsApi.matched.mockResolvedValue({ data: [{ id: ID }], nextCursor: null });
    const off = await renderHook(() => usePinnedRequirement(false), { wrapper });
    expect(off.result.current.fetchStatus).toBe('idle');
    const on = await renderHook(() => usePinnedRequirement(true), { wrapper });
    await waitFor(() => expect(on.result.current.data).toEqual({ id: ID }));
    expect(mockRequirementsApi.matched).toHaveBeenCalledWith({ limit: 1 });
  });

  it('filters my requirements by status', async () => {
    signedIn();
    mockRequirementsApi.mine.mockResolvedValue({ data: [], nextCursor: null });
    const { result } = await renderHook(() => useMyRequirements('open'), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockRequirementsApi.mine).toHaveBeenCalledWith({ cursor: undefined, status: 'open' });
  });

  it('sends a quote with its idempotency key and refreshes the lists', async () => {
    signedIn();
    mockRequirementsApi.quote.mockResolvedValue({ id: 'q', conversationId: 'c' });
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useSendQuote(), { wrapper });
    const input = { price: { amountPaise: 100, currency: 'INR' as const }, message: 'Ready soon.' };
    await act(async () => {
      await result.current.mutateAsync({ id: ID, key: KEY, input });
    });
    expect(mockRequirementsApi.quote).toHaveBeenCalledWith(ID, KEY, input);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['requirements'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['conversations'] });
  });
});
