import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';
import type {
  CreateProductInput,
  CreateServiceInput,
  Page,
  ListingStatus,
  Product,
  Service,
  UpdateProductInput,
  UpdateServiceInput,
} from '@supporters/shared';
import { productsApi, servicesApi, type MyListingsInputQuery } from '../../../lib/api';
import { businessKeys } from '../../business/hooks/useBusinessQuery';
import { removeListing, upsertListing } from '../listing-cache';

export const catalogKeys = {
  products: ['products'] as const,
  productDetail: (id: string) => [...catalogKeys.products, 'detail', id] as const,
  productsByBusiness: (businessId: string) =>
    [...catalogKeys.products, 'business', businessId] as const,
  myProducts: (filter?: MyListingsInputQuery) => [...catalogKeys.products, 'mine', filter] as const,

  services: ['services'] as const,
  serviceDetail: (id: string) => [...catalogKeys.services, 'detail', id] as const,
  servicesByBusiness: (businessId: string) =>
    [...catalogKeys.services, 'business', businessId] as const,
  myServices: (filter?: MyListingsInputQuery) => [...catalogKeys.services, 'mine', filter] as const,
};

export function useProduct(id: string) {
  return useQuery({
    queryKey: catalogKeys.productDetail(id),
    queryFn: () => productsApi.getPublic(id),
    enabled: Boolean(id),
  });
}

export function useService(id: string) {
  return useQuery({
    queryKey: catalogKeys.serviceDetail(id),
    queryFn: () => servicesApi.getPublic(id),
    enabled: Boolean(id),
  });
}

export function useBusinessProducts(businessId: string) {
  return useInfiniteQuery<Page<Product>, Error>({
    queryKey: catalogKeys.productsByBusiness(businessId),
    queryFn: ({ pageParam }) =>
      productsApi.listPublic(businessId, { cursor: pageParam as string | undefined }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(businessId),
  });
}

export function useBusinessServices(businessId: string) {
  return useInfiniteQuery<Page<Service>, Error>({
    queryKey: catalogKeys.servicesByBusiness(businessId),
    queryFn: ({ pageParam }) =>
      servicesApi.listPublic(businessId, { cursor: pageParam as string | undefined }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: Boolean(businessId),
  });
}

export function useMyProducts(filter?: MyListingsInputQuery) {
  return useInfiniteQuery<Page<Product>, Error>({
    queryKey: catalogKeys.myProducts(filter),
    queryFn: ({ pageParam }) =>
      productsApi.listMine({ ...filter, cursor: pageParam as string | undefined }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

export function useMyServices(filter?: MyListingsInputQuery) {
  return useInfiniteQuery<Page<Service>, Error>({
    queryKey: catalogKeys.myServices(filter),
    queryFn: ({ pageParam }) =>
      servicesApi.listMine({ ...filter, cursor: pageParam as string | undefined }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  });
}

type ListingKind = 'products' | 'services';

/** Writes a saved listing into the owner's cached lists and refreshes everything that counts it. */
export function cacheSavedListing<T extends { id: string; status: ListingStatus }>(
  queryClient: QueryClient,
  kind: ListingKind,
  saved: T,
) {
  const detailKey =
    kind === 'products' ? catalogKeys.productDetail(saved.id) : catalogKeys.serviceDetail(saved.id);
  queryClient.setQueryData(detailKey, saved);
  const mine = [...catalogKeys[kind], 'mine'];
  for (const [key, data] of queryClient.getQueriesData<InfiniteData<Page<T>>>({ queryKey: mine })) {
    const filter = (key[2] as MyListingsInputQuery | undefined)?.status;
    queryClient.setQueryData(key, upsertListing(data, saved, filter));
  }
  invalidateListings(queryClient, kind);
}

export function cacheRemovedListing(queryClient: QueryClient, kind: ListingKind, id: string) {
  const mine = [...catalogKeys[kind], 'mine'];
  for (const [key, data] of queryClient.getQueriesData<
    InfiniteData<Page<{ id: string; status: ListingStatus }>>
  >({ queryKey: mine })) {
    queryClient.setQueryData(key, removeListing(data, id));
  }
  queryClient.removeQueries({
    queryKey: kind === 'products' ? catalogKeys.productDetail(id) : catalogKeys.serviceDetail(id),
  });
  invalidateListings(queryClient, kind);
}

/** Public lists and the business's published-listings count both change when a listing does. */
function invalidateListings(queryClient: QueryClient, kind: ListingKind) {
  queryClient.invalidateQueries({ queryKey: catalogKeys[kind] });
  queryClient.invalidateQueries({ queryKey: businessKeys.mine() });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductInput) => productsApi.create(data),
    onSuccess: (saved) => cacheSavedListing(queryClient, 'products', saved),
  });
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductInput }) =>
      productsApi.update(id, data),
    onSuccess: (saved) => cacheSavedListing(queryClient, 'products', saved),
  });
}

export function useRemoveProductMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: (_result, id) => cacheRemovedListing(queryClient, 'products', id),
  });
}

export function useCreateServiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateServiceInput) => servicesApi.create(data),
    onSuccess: (saved) => cacheSavedListing(queryClient, 'services', saved),
  });
}

export function useUpdateServiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServiceInput }) =>
      servicesApi.update(id, data),
    onSuccess: (saved) => cacheSavedListing(queryClient, 'services', saved),
  });
}

export function useRemoveServiceMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => servicesApi.remove(id),
    onSuccess: (_result, id) => cacheRemovedListing(queryClient, 'services', id),
  });
}
