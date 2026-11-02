import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { catalogApi, myBusinessApi } from '../../lib/api';
import { catalogKeys, flattenPages, useBusiness, useBusinessProducts } from '../catalog/queries';
import { myBusiness, product, service } from '../catalog/test-fixtures';
import {
  hubKeys,
  useMyBusiness,
  useMyProduct,
  useMyService,
  useSaveProduct,
  useUpdateBusiness,
} from './queries';

jest.mock('../../lib/api', () => ({
  catalogApi: {
    business: jest.fn(),
    businessProducts: jest.fn(),
    product: jest.fn(),
    service: jest.fn(),
  },
  myBusinessApi: {
    get: jest.fn(),
    update: jest.fn(),
    products: jest.fn(),
    createProduct: jest.fn(),
    updateProduct: jest.fn(),
  },
  uploadsApi: { upload: jest.fn() },
  readLocalFile: jest.fn(),
}));

const mockCatalog = jest.mocked(catalogApi);
const mockMine = jest.mocked(myBusinessApi);

const clients: QueryClient[] = [];

function setup() {
  // gcTime Infinity schedules no garbage-collection timers, so Jest can exit.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  clients.push(queryClient);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
}

beforeEach(() => jest.clearAllMocks());
afterEach(() => {
  clients.splice(0).forEach((client) => client.clear());
});

describe('catalog queries', () => {
  it("doesn't call the API for an invalid route param", async () => {
    const { wrapper } = setup();
    const { result } = await renderHook(() => useBusiness(null), { wrapper });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockCatalog.business).not.toHaveBeenCalled();
  });

  it('loads further pages with the cursor', async () => {
    const { wrapper } = setup();
    mockCatalog.businessProducts
      .mockResolvedValueOnce({ data: [product], nextCursor: 'next' })
      .mockResolvedValueOnce({ data: [{ ...product, id: 'second' }], nextCursor: null });

    const { result } = await renderHook(() => useBusinessProducts(myBusiness.id), { wrapper });
    await waitFor(() => expect(result.current.hasNextPage).toBe(true));
    await act(async () => {
      await result.current.fetchNextPage();
    });

    expect(mockCatalog.businessProducts).toHaveBeenLastCalledWith(myBusiness.id, 'next');
    await waitFor(() =>
      expect(flattenPages(result.current.data).map((item) => item.id)).toEqual([
        product.id,
        'second',
      ]),
    );
    expect(result.current.hasNextPage).toBe(false);
  });
});

describe('hub queries', () => {
  it('returns null for a user without a business', async () => {
    const { wrapper } = setup();
    mockMine.get.mockResolvedValue(null);
    const { result } = await renderHook(() => useMyBusiness(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('stores the saved business and refreshes its public page', async () => {
    const { wrapper, queryClient } = setup();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    const saved = { ...myBusiness, about: 'Updated' };
    mockMine.update.mockResolvedValue(saved);

    const { result } = await renderHook(() => useUpdateBusiness(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ about: 'Updated' });
    });

    expect(queryClient.getQueryData(hubKeys.business)).toEqual(saved);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: catalogKeys.business(saved.slug) });
  });

  it('creates a product without an id', async () => {
    const { wrapper } = setup();
    mockMine.createProduct.mockResolvedValue(product);
    const { result } = await renderHook(() => useSaveProduct(null), { wrapper });
    const input = {
      title: 'Kurta',
      categoryId: product.category.id,
      description: 'Cotton',
      availability: 'in_stock' as const,
      shippingArea: { allIndia: true, stateIds: [], cityIds: [] },
      specs: [],
      mediaIds: [],
      status: 'draft' as const,
    };
    await act(async () => {
      await result.current.mutateAsync(input);
    });
    expect(mockMine.createProduct).toHaveBeenCalledWith(input);
    expect(mockMine.updateProduct).not.toHaveBeenCalled();
  });

  it('updates a product by id, clearing emptied fields, and refreshes the lists', async () => {
    const { wrapper, queryClient } = setup();
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');
    mockMine.updateProduct.mockResolvedValue(product);
    const { result } = await renderHook(() => useSaveProduct(product.id), { wrapper });

    await act(async () => {
      await result.current.mutateAsync({
        title: 'Kurta',
        categoryId: product.category.id,
        description: 'Cotton',
        availability: 'in_stock',
        shippingArea: { allIndia: true, stateIds: [], cityIds: [] },
        specs: [],
        mediaIds: [],
        status: 'published',
      });
    });

    expect(mockMine.updateProduct).toHaveBeenCalledWith(
      product.id,
      expect.objectContaining({ title: 'Kurta', price: null, moq: null }),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: hubKeys.products });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: hubKeys.business });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: catalogKeys.product(product.id) });
  });

  it('edits a draft from the loaded owner list, without the public endpoint', async () => {
    const { wrapper, queryClient } = setup();
    const draft = { ...product, status: 'draft' as const };
    queryClient.setQueryData(hubKeys.products, {
      pages: [{ data: [draft], nextCursor: null }],
      pageParams: [null],
    });

    const { result } = await renderHook(() => useMyProduct(draft.id), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(draft));
    expect(mockCatalog.product).not.toHaveBeenCalled();
  });

  it('falls back to the public endpoint when the list is not loaded', async () => {
    const { wrapper } = setup();
    mockCatalog.service.mockResolvedValue(service);
    const { result } = await renderHook(() => useMyService(service.id), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual(service));
    expect(mockCatalog.service).toHaveBeenCalledWith(service.id);
  });
});
