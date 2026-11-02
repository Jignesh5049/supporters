import {
  UploadPurpose,
  type CreateBusinessInput,
  type CreateProductInput,
  type CreateServiceInput,
  type Media,
  type MyBusiness,
  type Page,
  type Product,
  type Service,
  type UpdateBusinessInput,
} from '@supporters/shared';
import {
  type InfiniteData,
  type QueryClient,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { catalogApi, myBusinessApi, readLocalFile, uploadsApi } from '../../lib/api';
import { catalogKeys, flattenPages } from '../catalog/queries';
import { toProductUpdate, toServiceUpdate } from './forms';

export const hubKeys = {
  business: ['me', 'business'] as const,
  products: ['me', 'business', 'products'] as const,
  services: ['me', 'business', 'services'] as const,
};

const pageOptions = {
  initialPageParam: null as string | null,
  getNextPageParam: (last: Page<unknown>) => last.nextCursor,
};

/** The signed-in user's business, or null before onboarding. */
export function useMyBusiness(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: hubKeys.business,
    queryFn: () => myBusinessApi.get(),
    enabled: options.enabled ?? true,
  });
}

/** Updates the owner's cache and drops the public page, so both show the saved business. */
function storeMyBusiness(queryClient: QueryClient, business: MyBusiness) {
  queryClient.setQueryData(hubKeys.business, business);
  void queryClient.invalidateQueries({ queryKey: catalogKeys.business(business.slug) });
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBusinessInput) => myBusinessApi.create(input),
    onSuccess: (business) => storeMyBusiness(queryClient, business),
  });
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateBusinessInput) => myBusinessApi.update(input),
    onSuccess: (business) => storeMyBusiness(queryClient, business),
  });
}

export function useMyProducts() {
  return useInfiniteQuery({
    queryKey: hubKeys.products,
    queryFn: ({ pageParam }) => myBusinessApi.products(pageParam),
    ...pageOptions,
  });
}

export function useMyServices() {
  return useInfiniteQuery({
    queryKey: hubKeys.services,
    queryFn: ({ pageParam }) => myBusinessApi.services(pageParam),
    ...pageOptions,
  });
}

/** Finds a listing in the owner's loaded pages; drafts aren't on the public endpoints. */
export function findCachedListing<T extends { id: string }>(
  queryClient: QueryClient,
  key: readonly string[],
  id: string,
): T | undefined {
  const data = queryClient.getQueryData<InfiniteData<Page<T>>>(key);
  return flattenPages(data).find((item) => item.id === id);
}

/**
 * One of the owner's products, for the edit form. There is no `GET /me/business/products/:id`
 * yet, so this uses the loaded list and falls back to the public endpoint (published only).
 */
export function useMyProduct(id: string | null) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...hubKeys.products, 'item', id ?? ''],
    queryFn: () =>
      findCachedListing<Product>(queryClient, hubKeys.products, id ?? '') ??
      catalogApi.product(id ?? ''),
    enabled: id !== null,
  });
}

export function useMyService(id: string | null) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: [...hubKeys.services, 'item', id ?? ''],
    queryFn: () =>
      findCachedListing<Service>(queryClient, hubKeys.services, id ?? '') ??
      catalogApi.service(id ?? ''),
    enabled: id !== null,
  });
}

/** After a listing changes: the lists, the public pages and the published count are stale. */
function refreshListings(
  queryClient: QueryClient,
  listKey: readonly string[],
  itemKey: readonly string[],
  businessId: string,
) {
  void queryClient.invalidateQueries({ queryKey: listKey });
  void queryClient.invalidateQueries({ queryKey: itemKey });
  void queryClient.invalidateQueries({ queryKey: hubKeys.business });
  void queryClient.invalidateQueries({ queryKey: ['business', businessId] });
}

/** Creates the product, or updates it when an id is given. */
export function useSaveProduct(id: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) =>
      id
        ? myBusinessApi.updateProduct(id, toProductUpdate(input))
        : myBusinessApi.createProduct(input),
    onSuccess: (product) =>
      refreshListings(
        queryClient,
        hubKeys.products,
        catalogKeys.product(product.id),
        product.business.id,
      ),
  });
}

export function useSaveService(id: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateServiceInput) =>
      id
        ? myBusinessApi.updateService(id, toServiceUpdate(input))
        : myBusinessApi.createService(input),
    onSuccess: (service) =>
      refreshListings(
        queryClient,
        hubKeys.services,
        catalogKeys.service(service.id),
        service.business.id,
      ),
  });
}

/** A picked image: a local URI plus the type the picker reported. */
export interface PickedImage {
  uri: string;
  mimeType?: string | null;
}

/** Presign, PUT and complete one image. Resolves the media to put in the form. */
export function useUploadImage(purpose: UploadPurpose = UploadPurpose.Listing) {
  return useMutation({
    mutationFn: async (image: PickedImage): Promise<Media> => {
      const upload = await uploadsApi.upload(
        purpose,
        await readLocalFile(image.uri, image.mimeType),
      );
      return { id: upload.id, url: upload.url ?? image.uri };
    },
  });
}
