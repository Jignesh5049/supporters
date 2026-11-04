import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from '../../../lib/api/errors';
import { businessKeys } from '../../business/hooks/useBusinessQuery';
import { makeBusiness, makePost, uuid } from '../fixtures';
import { socialKeys } from '../query-keys';
import { useToggleFollow } from './use-follow';
import { useLikePost } from './use-like-post';
import { useToggleSave } from './use-save';

const mockApi = {
  postsApi: { setLiked: jest.fn() },
  socialApi: { setSaved: jest.fn(), setFollowing: jest.fn() },
};
jest.mock('../../../lib/api', () => ({
  get postsApi() {
    return mockApi.postsApi;
  },
  get socialApi() {
    return mockApi.socialApi;
  },
}));

const clients: QueryClient[] = [];

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { gcTime: Infinity, retry: false }, mutations: { retry: false } },
  });
  clients.push(queryClient);
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

type Post = ReturnType<typeof makePost>;
const feedKey = [...socialKeys.feed('u1'), 'all-india'];
const feedOf = (...posts: Post[]) => ({
  pages: [{ data: posts, nextCursor: null }],
  pageParams: [undefined],
});
const firstFeedPost = (queryClient: QueryClient) =>
  queryClient.getQueryData<ReturnType<typeof feedOf>>(feedKey)?.pages[0].data[0];

afterEach(() => {
  jest.clearAllMocks();
  clients.splice(0).forEach((client) => client.clear());
});

describe('useLikePost', () => {
  it('likes optimistically everywhere, then keeps the server count', async () => {
    const { queryClient, wrapper } = setup();
    const post = makePost(1);
    const detailKey = [...socialKeys.post(post.id), 'u1'];
    queryClient.setQueryData(feedKey, feedOf(post));
    queryClient.setQueryData(detailKey, post);
    let resolve: (value: { isLiked: boolean; likeCount: number }) => void = () => {};
    mockApi.postsApi.setLiked.mockReturnValue(new Promise((r) => (resolve = r)));

    const { result } = await renderHook(() => useLikePost(), { wrapper });
    await act(async () => result.current.mutate({ postId: post.id, isLiked: true }));

    await waitFor(() =>
      expect(firstFeedPost(queryClient)).toMatchObject({ isLiked: true, likeCount: 4 }),
    );
    expect(queryClient.getQueryData<Post>(detailKey)).toMatchObject({
      isLiked: true,
      likeCount: 4,
    });

    await act(async () => resolve({ isLiked: true, likeCount: 9 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData<Post>(detailKey)).toMatchObject({
      isLiked: true,
      likeCount: 9,
    });
  });

  it('rolls back every cache when the API refuses', async () => {
    const { queryClient, wrapper } = setup();
    const post = makePost(1);
    queryClient.setQueryData(feedKey, feedOf(post));
    mockApi.postsApi.setLiked.mockRejectedValue(new ApiError(500, 'SERVICE_UNAVAILABLE'));

    const { result } = await renderHook(() => useLikePost(), { wrapper });
    await act(async () => result.current.mutate({ postId: post.id, isLiked: true }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(firstFeedPost(queryClient)).toMatchObject({ isLiked: false, likeCount: 3 });
  });

  it('never drops the count below zero', async () => {
    const { queryClient, wrapper } = setup();
    const post = makePost(1, { isLiked: true, likeCount: 0 });
    queryClient.setQueryData(feedKey, feedOf(post));
    mockApi.postsApi.setLiked.mockResolvedValue({ isLiked: false, likeCount: 0 });

    const { result } = await renderHook(() => useLikePost(), { wrapper });
    await act(async () => result.current.mutate({ postId: post.id, isLiked: false }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(firstFeedPost(queryClient)).toMatchObject({ isLiked: false, likeCount: 0 });
  });
});

describe('useToggleSave', () => {
  it('rolls a post save back on error', async () => {
    const { queryClient, wrapper } = setup();
    const post = makePost(2);
    queryClient.setQueryData(feedKey, feedOf(post));
    mockApi.socialApi.setSaved.mockRejectedValue(new ApiError(0, 'NETWORK_ERROR'));

    const { result } = await renderHook(() => useToggleSave(), { wrapper });
    await act(async () => result.current.mutate({ type: 'post', id: post.id, isSaved: true }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(firstFeedPost(queryClient)).toMatchObject({ isSaved: false, saveCount: 1 });
  });

  it('calls the API with the target type and id', async () => {
    const { wrapper } = setup();
    mockApi.socialApi.setSaved.mockResolvedValue({ isSaved: false });
    const { result } = await renderHook(() => useToggleSave(), { wrapper });
    await act(async () => result.current.mutate({ type: 'product', id: uuid(7), isSaved: false }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApi.socialApi.setSaved).toHaveBeenCalledWith('product', uuid(7), false);
  });
});

describe('useToggleFollow', () => {
  const countOf = (queryClient: QueryClient, slug: string) =>
    queryClient.getQueryData<ReturnType<typeof makeBusiness>>(businessKeys.detail(slug))
      ?.followerCount;

  it('rolls the follower count back on error', async () => {
    const { queryClient, wrapper } = setup();
    const business = makeBusiness();
    queryClient.setQueryData(businessKeys.detail(business.slug), business);
    mockApi.socialApi.setFollowing.mockRejectedValue(new ApiError(500, 'SERVICE_UNAVAILABLE'));

    const { result } = await renderHook(() => useToggleFollow(), { wrapper });
    await act(async () => result.current.mutate({ businessId: business.id, isFollowing: true }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(countOf(queryClient, business.slug)).toBe(10);
  });

  it('moves the count at once and keeps the server count on success', async () => {
    const { queryClient, wrapper } = setup();
    const business = makeBusiness();
    queryClient.setQueryData(businessKeys.detail(business.slug), business);
    let resolve: (value: { isFollowing: boolean; followerCount: number }) => void = () => {};
    mockApi.socialApi.setFollowing.mockReturnValue(new Promise((r) => (resolve = r)));

    const { result } = await renderHook(() => useToggleFollow(), { wrapper });
    await act(async () => result.current.mutate({ businessId: business.id, isFollowing: true }));
    await waitFor(() => expect(countOf(queryClient, business.slug)).toBe(11));

    await act(async () => resolve({ isFollowing: true, followerCount: 14 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(countOf(queryClient, business.slug)).toBe(14);
  });

  it('adds a new follow to the following list at once and restores it on error', async () => {
    const { queryClient, wrapper } = setup();
    const business = makeBusiness();
    const summary = {
      id: business.id,
      slug: business.slug,
      name: 'Asha Traders',
      logo: null,
      city: { id: uuid(901), name: 'Surat', stateCode: 'GJ' },
      isVerified: false,
      isPremium: false,
    };
    const key = [...socialKeys.following, 'u1'];
    queryClient.setQueryData(key, {
      pages: [{ data: [], nextCursor: null }],
      pageParams: [undefined],
    });
    mockApi.socialApi.setFollowing.mockRejectedValue(new ApiError(500, 'SERVICE_UNAVAILABLE'));

    const { result } = await renderHook(() => useToggleFollow(), { wrapper });
    const listOf = () =>
      queryClient.getQueryData<{ pages: { data: unknown[] }[] }>(key)?.pages[0].data.length;
    await act(async () => {
      result.current.mutate({ businessId: business.id, isFollowing: true, summary });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(listOf()).toBe(0);
  });
});
