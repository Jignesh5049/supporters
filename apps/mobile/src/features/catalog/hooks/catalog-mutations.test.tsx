import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider, type InfiniteData } from '@tanstack/react-query';
import type { Page, Product } from '@supporters/shared';
import { businessKeys } from '../../business/hooks/useBusinessQuery';
import { uuid } from '../../social/fixtures';
import { makeMyBusiness, makeProduct } from '../fixtures';
import {
  catalogKeys,
  useCreateProductMutation,
  useRemoveProductMutation,
  useUpdateProductMutation,
} from './useCatalogQuery';

const mockApi = {
  productsApi: { create: jest.fn(), update: jest.fn(), remove: jest.fn() },
  servicesApi: {},
};
jest.mock('../../../lib/api', () => ({
  get productsApi() {
    return mockApi.productsApi;
  },
  get servicesApi() {
    return mockApi.servicesApi;
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

const pagesOf = (...products: Product[]): InfiniteData<Page<Product>> => ({
  pages: [{ data: products, nextCursor: null }],
  pageParams: [undefined],
});
const ids = (data: InfiniteData<Page<Product>> | undefined) =>
  data?.pages.flatMap((page) => page.data.map((p) => p.id));

afterEach(() => {
  jest.clearAllMocks();
  clients.splice(0).forEach((client) => client.clear());
});

describe('useUpdateProductMutation', () => {
  it('moves a listing between the status lists and updates its detail', async () => {
    const { queryClient, wrapper } = setup();
    const draft = makeProduct(1, { status: 'draft', publishedAt: null });
    const published = makeProduct(1, { status: 'published' });
    const draftsKey = catalogKeys.myProducts({ status: 'draft' });
    const publishedKey = catalogKeys.myProducts({ status: 'published' });
    queryClient.setQueryData(draftsKey, pagesOf(draft, makeProduct(2, { status: 'draft' })));
    queryClient.setQueryData(publishedKey, pagesOf(makeProduct(3)));
    mockApi.productsApi.update.mockResolvedValue(published);

    const { result } = await renderHook(() => useUpdateProductMutation(), { wrapper });
    await act(async () => result.current.mutate({ id: draft.id, data: { status: 'published' } }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApi.productsApi.update).toHaveBeenCalledWith(draft.id, { status: 'published' });
    expect(ids(queryClient.getQueryData(draftsKey))).toEqual([uuid(2)]);
    expect(ids(queryClient.getQueryData(publishedKey))).toEqual([uuid(1), uuid(3)]);
    expect(queryClient.getQueryData(catalogKeys.productDetail(draft.id))).toEqual(published);
  });

  it('refreshes the business so the published count follows', async () => {
    const { queryClient, wrapper } = setup();
    queryClient.setQueryData(businessKeys.mine(), makeMyBusiness());
    mockApi.productsApi.update.mockResolvedValue(makeProduct(1));

    const { result } = await renderHook(() => useUpdateProductMutation(), { wrapper });
    await act(async () => result.current.mutate({ id: uuid(1), data: { status: 'published' } }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(queryClient.getQueryState(businessKeys.mine())?.isInvalidated).toBe(true);
  });

  it('leaves the cache alone when the API refuses, e.g. at the listing limit', async () => {
    const { queryClient, wrapper } = setup();
    const draft = makeProduct(1, { status: 'draft' });
    const draftsKey = catalogKeys.myProducts({ status: 'draft' });
    queryClient.setQueryData(draftsKey, pagesOf(draft));
    mockApi.productsApi.update.mockRejectedValue(new Error('LISTING_LIMIT_REACHED'));

    const { result } = await renderHook(() => useUpdateProductMutation(), { wrapper });
    await act(async () => result.current.mutate({ id: draft.id, data: { status: 'published' } }));
    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(ids(queryClient.getQueryData(draftsKey))).toEqual([draft.id]);
  });
});

describe('useCreateProductMutation', () => {
  it('adds the new product to the top of the matching list only', async () => {
    const { queryClient, wrapper } = setup();
    const draftsKey = catalogKeys.myProducts({ status: 'draft' });
    const publishedKey = catalogKeys.myProducts({ status: 'published' });
    queryClient.setQueryData(draftsKey, pagesOf(makeProduct(2, { status: 'draft' })));
    queryClient.setQueryData(publishedKey, pagesOf(makeProduct(3)));
    const created = makeProduct(1, { status: 'draft', publishedAt: null });
    mockApi.productsApi.create.mockResolvedValue(created);

    const { result } = await renderHook(() => useCreateProductMutation(), { wrapper });
    await act(async () =>
      result.current.mutate({
        title: 'Product 1',
        categoryId: uuid(800),
        description: 'x',
        availability: 'in_stock',
        shippingArea: { allIndia: true, stateIds: [], cityIds: [] },
        specs: [],
        mediaIds: [],
        status: 'draft',
      }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(ids(queryClient.getQueryData(draftsKey))).toEqual([uuid(1), uuid(2)]);
    expect(ids(queryClient.getQueryData(publishedKey))).toEqual([uuid(3)]);
  });
});

describe('useRemoveProductMutation', () => {
  it('takes the product out of every list and drops its detail', async () => {
    const { queryClient, wrapper } = setup();
    const keep = makeProduct(2);
    const gone = makeProduct(1);
    const publishedKey = catalogKeys.myProducts({ status: 'published' });
    const allKey = catalogKeys.myProducts();
    queryClient.setQueryData(publishedKey, pagesOf(gone, keep));
    queryClient.setQueryData(allKey, pagesOf(gone, keep));
    queryClient.setQueryData(catalogKeys.productDetail(gone.id), gone);
    mockApi.productsApi.remove.mockResolvedValue(undefined);

    const { result } = await renderHook(() => useRemoveProductMutation(), { wrapper });
    await act(async () => result.current.mutate(gone.id));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockApi.productsApi.remove).toHaveBeenCalledWith(gone.id);
    expect(ids(queryClient.getQueryData(publishedKey))).toEqual([keep.id]);
    expect(ids(queryClient.getQueryData(allKey))).toEqual([keep.id]);
    expect(queryClient.getQueryData(catalogKeys.productDetail(gone.id))).toBeUndefined();
  });
});
