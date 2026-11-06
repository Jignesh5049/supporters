import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import type { Enquiry, EnquiryStatus, ListingRef, Page } from '@supporters/shared';
import { enquiriesApi, type EnquiryDraft } from '../../lib/api';
import { chatKeys } from '../messages/query-keys';
import { useViewerId } from '../social/use-viewer';

/** The buyer's own enquiries (GET /v1/me/enquiries), newest first. */
export function useMyEnquiries() {
  const viewerId = useViewerId();
  return useInfiniteQuery({
    queryKey: chatKeys.myEnquiries(viewerId ?? 'guest'),
    queryFn: ({ pageParam }) => enquiriesApi.mine({ cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: viewerId !== null,
  });
}

export interface BusinessEnquiryFilter {
  status?: EnquiryStatus;
  /** Enquiries on or after this many days ago; none means all time. */
  days?: number;
  listing?: ListingRef;
}

/** Start of the day `days` ago, as the ISO date-time the API takes. */
export function sinceDays(days: number, now: Date = new Date()): string {
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - days);
  return from.toISOString();
}

/** The owner's enquiry inbox (GET /v1/me/business/enquiries) with status, date and listing filters. */
export function useBusinessEnquiries(filter: BusinessEnquiryFilter) {
  const viewerId = useViewerId();
  const listingKey = filter.listing ? `${filter.listing.type}:${filter.listing.id}` : undefined;
  return useInfiniteQuery({
    queryKey: [
      ...chatKeys.businessEnquiries(viewerId ?? 'guest', {
        status: filter.status,
        listing: listingKey,
      }),
      filter.days ?? 'all',
    ],
    queryFn: ({ pageParam }) =>
      enquiriesApi.forBusiness({
        cursor: pageParam,
        status: filter.status,
        from: filter.days !== undefined ? sinceDays(filter.days) : undefined,
        productId: filter.listing?.type === 'product' ? filter.listing.id : undefined,
        serviceId: filter.listing?.type === 'service' ? filter.listing.id : undefined,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: viewerId !== null,
  });
}

/** POST /v1/enquiries. The key is made by the form and reused on retry. */
export function useCreateEnquiry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, draft }: { key: string; draft: EnquiryDraft }) =>
      enquiriesApi.create(key, draft),
    onSuccess: () => {
      // The enquiry card is the newest message of its thread.
      void queryClient.invalidateQueries({ queryKey: chatKeys.conversations });
      void queryClient.invalidateQueries({ queryKey: chatKeys.enquiries });
    },
  });
}

type EnquiryPages = InfiniteData<Page<Enquiry>, string | undefined>;

/** The owner closes an enquiry (PATCH status closed); optimistic in every cached list. */
export function useCloseEnquiry() {
  const queryClient = useQueryClient();
  const family = [...chatKeys.enquiries, 'business'];
  return useMutation({
    mutationFn: (id: string) => enquiriesApi.close(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: family });
      const snapshot = queryClient.getQueriesData<EnquiryPages>({ queryKey: family });
      queryClient.setQueriesData<EnquiryPages>({ queryKey: family }, (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                data: page.data.map((enquiry) =>
                  enquiry.id === id ? { ...enquiry, status: 'closed' as const } : enquiry,
                ),
              })),
            }
          : data,
      );
      return { snapshot };
    },
    onError: (_error, _id, context) => {
      for (const [key, value] of context?.snapshot ?? []) queryClient.setQueryData(key, value);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: family }),
  });
}
