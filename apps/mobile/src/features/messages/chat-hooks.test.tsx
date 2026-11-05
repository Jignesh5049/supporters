import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SessionStatus, useSessionStore } from '../../stores/session-store';
import { useBusinessEnquiries, useCloseEnquiry, useCreateEnquiry } from '../enquiries/hooks';
import { CONVERSATION, makeConversation, makeEnquiry, makeMessage, page, VIEWER } from './fixtures';
import { useConversations, useUpdateConversation } from './hooks/use-conversations';
import { useThreadMessages } from './hooks/use-thread';

const mockChat = { conversations: jest.fn(), messages: jest.fn(), update: jest.fn() };
const mockEnquiries = { forBusiness: jest.fn(), create: jest.fn(), close: jest.fn() };
jest.mock('../../lib/api', () => ({
  get chatApi() {
    return mockChat;
  },
  get enquiriesApi() {
    return mockEnquiries;
  },
}));
jest.mock('../../lib/socket', () => ({ realtime: {} }));

let client: QueryClient;
function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false } } });
  useSessionStore.getState().setSignedIn({
    id: VIEWER,
    name: 'Asha',
    phone: '+919876543210',
    email: null,
    emailVerified: false,
    role: 'user',
    cityId: null,
    createdAt: '2026-10-30T10:00:00.000Z',
  });
});

afterEach(() => {
  jest.clearAllMocks();
  client.clear();
  useSessionStore.setState({ status: SessionStatus.Restoring, user: null });
});

describe('inbox', () => {
  it('lists conversations with the search text and pages with the cursor', async () => {
    mockChat.conversations
      .mockResolvedValueOnce(page([makeConversation({ unreadCount: 2 })], 'next'))
      .mockResolvedValueOnce(page([], null));
    const { result } = await renderHook(() => useConversations('  steel '), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockChat.conversations).toHaveBeenCalledWith({
      cursor: undefined,
      q: 'steel',
      hidden: false,
    });
    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(mockChat.conversations).toHaveBeenLastCalledWith({
      cursor: 'next',
      q: 'steel',
      hidden: false,
    });
  });

  it('stays idle for guests', async () => {
    useSessionStore.getState().setGuest();
    await renderHook(() => useConversations(), { wrapper });
    expect(mockChat.conversations).not.toHaveBeenCalled();
  });

  it('mutes optimistically and rolls back when the API fails', async () => {
    client.setQueryData(['conversations', 'list', VIEWER, '', false], {
      pages: [page([makeConversation()])],
      pageParams: [undefined],
    });
    mockChat.update.mockRejectedValue(new Error('offline'));
    const { result } = await renderHook(() => useUpdateConversation(CONVERSATION), { wrapper });
    await act(async () => {
      result.current.mutate({ muted: true });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    const cached = client.getQueryData<{ pages: { data: { muted: boolean }[] }[] }>([
      'conversations',
      'list',
      VIEWER,
      '',
      false,
    ]);
    expect(cached?.pages[0]?.data[0]?.muted).toBe(false);
  });
});

describe('thread history', () => {
  it('pages back with the cursor', async () => {
    mockChat.messages
      .mockResolvedValueOnce(page([makeMessage(2)], 'older'))
      .mockResolvedValueOnce(page([makeMessage(1)], null));
    const { result } = await renderHook(() => useThreadMessages(CONVERSATION), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);
    await act(async () => {
      await result.current.fetchNextPage();
    });
    expect(mockChat.messages).toHaveBeenLastCalledWith(CONVERSATION, { cursor: 'older' });
    await waitFor(() => expect(result.current.hasNextPage).toBe(false));
  });
});

describe('enquiries', () => {
  it('filters the owner inbox by status, listing and date', async () => {
    mockEnquiries.forBusiness.mockResolvedValue(page([makeEnquiry(1)]));
    const listing = { type: 'service' as const, id: '00000000-0000-4000-8000-000000000009' };
    const { result } = await renderHook(
      () => useBusinessEnquiries({ status: 'new', listing, days: 7 }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockEnquiries.forBusiness).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'new', serviceId: listing.id, productId: undefined }),
    );
    expect(mockEnquiries.forBusiness.mock.calls[0][0].from).toMatch(/^\d{4}-\d\d-\d\dT/);
  });

  it('closes optimistically in cached lists', async () => {
    mockEnquiries.forBusiness.mockResolvedValue(page([makeEnquiry(1)]));
    let finish: (value: unknown) => void = () => undefined;
    mockEnquiries.close.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    const list = await renderHook(() => useBusinessEnquiries({}), { wrapper });
    await waitFor(() => expect(list.result.current.isSuccess).toBe(true));
    const close = await renderHook(() => useCloseEnquiry(), { wrapper });
    await act(async () => {
      close.result.current.mutate(makeEnquiry(1).id);
    });
    await waitFor(() => {
      const cached = client.getQueriesData<{ pages: { data: { status: string }[] }[] }>({
        queryKey: ['enquiries', 'business'],
      });
      expect(cached[0]?.[1]?.pages[0]?.data[0]?.status).toBe('closed');
    });
    await act(async () => {
      finish(makeEnquiry(1, { status: 'closed' }));
    });
  });

  it('sends the Idempotency-Key and surfaces a rate limit error', async () => {
    const error = new Error('limited');
    mockEnquiries.create.mockRejectedValue(error);
    const { result } = await renderHook(() => useCreateEnquiry(), { wrapper });
    const draft = { productId: makeEnquiry(1).id, message: 'x'.repeat(25), sharePhone: false };
    await act(async () => {
      result.current.mutate({ key: 'k-1', draft });
    });
    await waitFor(() => expect(result.current.error).toBe(error));
    expect(mockEnquiries.create).toHaveBeenCalledWith('k-1', draft);
  });
});
