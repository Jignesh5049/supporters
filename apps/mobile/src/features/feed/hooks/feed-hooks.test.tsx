import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionStatus, useSessionStore } from '../../../stores/session-store';
import { makePost, uuid } from '../../social/fixtures';
import { useFeed } from './use-feed';

const mockSocialApi = { feed: jest.fn(), markSeen: jest.fn() };
jest.mock('../../../lib/api', () => ({
  get socialApi() {
    return mockSocialApi;
  },
}));

let client: QueryClient;
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } });
});

const page = (ids: number[], nextCursor: string | null) => ({
  data: ids.map((n) => ({ ...makePost(n), source: 'all_india' })),
  nextCursor,
});

const signedIn = () =>
  useSessionStore.getState().setSignedIn({
    id: uuid(1),
    name: 'Asha',
    phone: '+919876543210',
    email: null,
    emailVerified: false,
    role: 'user',
    cityId: null,
    createdAt: '2026-10-30T10:00:00.000Z',
  });

afterEach(() => {
  jest.clearAllMocks();
  client.clear();
  useSessionStore.setState({ status: SessionStatus.Restoring, user: null });
});

describe('useFeed', () => {
  it('waits for the stored session before loading', async () => {
    mockSocialApi.feed.mockResolvedValue(page([1], null));
    await renderHook(() => useFeed(), { wrapper });
    expect(mockSocialApi.feed).not.toHaveBeenCalled();
  });

  it('loads the guest feed with the chosen city and pages with the cursor', async () => {
    useSessionStore.getState().setGuest();
    mockSocialApi.feed
      .mockResolvedValueOnce(page([1, 2], 'next'))
      .mockResolvedValueOnce(page([3], null));
    const { result } = await renderHook(() => useFeed(uuid(5)), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSocialApi.feed).toHaveBeenLastCalledWith({ cursor: undefined, city: uuid(5) });
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(mockSocialApi.feed).toHaveBeenLastCalledWith({ cursor: 'next', city: uuid(5) });
    await waitFor(() => expect(result.current.data?.pages).toHaveLength(2));
    expect(result.current.data?.pages.flatMap((p) => p.data)).toHaveLength(3);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('ignores the city for signed-in users', async () => {
    signedIn();
    mockSocialApi.feed.mockResolvedValue(page([1], null));
    const { result } = await renderHook(() => useFeed(uuid(5)), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockSocialApi.feed).toHaveBeenCalledWith({ cursor: undefined, city: undefined });
  });
});
