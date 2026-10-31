import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CreateProductInput,
  CreateServiceInput,
  Page,
  Product,
  Service,
  UpdateProductInput,
  UpdateServiceInput,
} from '@supporters/shared';
import { productsApi, servicesApi, type MyListingsInputQuery } from '../../../lib/api';

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

export function useCreateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductInput) => productsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogKeys.products });
    },
  });
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProductInput }) =>
      productsApi.update(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(catalogKeys.productDetail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: catalogKeys.products });
    },
  });
}

export function useCreateServiceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateServiceInput) => servicesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogKeys.services });
    },
  });
}

export function useUpdateServiceMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateServiceInput }) =>
      servicesApi.update(id, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(catalogKeys.serviceDetail(updated.id), updated);
      queryClient.invalidateQueries({ queryKey: catalogKeys.services });
    },
  });
}
