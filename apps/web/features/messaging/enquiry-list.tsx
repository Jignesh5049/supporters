'use client';

import type { Enquiry, EnquiryStatus, Page } from '@supporters/shared';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@supporters/ui-web/components/alert-dialog';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { Skeleton } from '@supporters/ui-web/components/skeleton';
import { cn } from '@supporters/ui-web/lib/utils';
import {
  type InfiniteData,
  type UseInfiniteQueryResult,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { MapPin, MessageSquare, Phone } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { flattenPages } from '@/features/social/use-feed';
import { errorMessage } from '@/lib/api/errors';
import { chatApi } from './chat-api';
import { chatKeys } from './chat-cache';
import {
  ENQUIRY_STATUS_LABELS,
  formatInboxTime,
  quantityText,
  toListingCardView,
} from './chat-mappers';
import { businessEnquiriesQueryOptions, myEnquiriesQueryOptions } from './chat-queries';

const FILTERS: { label: string; status: EnquiryStatus | null }[] = [
  { label: 'All', status: null },
  { label: 'New', status: 'new' },
  { label: 'Responded', status: 'responded' },
  { label: 'Closed', status: 'closed' },
];

const STATUS_STYLES: Record<EnquiryStatus, string> = {
  new: 'bg-warning-soft text-warning',
  responded: 'bg-success-soft text-success',
  closed: 'bg-muted text-muted-foreground',
};

type EnquiryQuery = UseInfiniteQueryResult<InfiniteData<Page<Enquiry>, unknown>, Error>;

/** The buyer's own enquiries (`GET /v1/me/enquiries`). */
export function MyEnquiries() {
  const query = useInfiniteQuery(myEnquiriesQueryOptions());
  return (
    <EnquiryResults
      query={query}
      empty="You have not sent any enquiries yet. Use “Contact supplier” on a product or service."
      view="buyer"
    />
  );
}

/** The owner's inbox (`GET /v1/me/business/enquiries`), filtered by status, live. */
export function BusinessEnquiries() {
  const [status, setStatus] = useState<EnquiryStatus | null>(null);
  const query = useInfiniteQuery(businessEnquiriesQueryOptions(status));
  return (
    <div className="space-y-4">
      <nav aria-label="Enquiry status" className="flex gap-1 border-b border-border">
        {FILTERS.map(({ label, status: value }) => (
          <button
            key={label}
            type="button"
            aria-pressed={value === status}
            onClick={() => setStatus(value)}
            className={cn(
              'border-b-2 px-4 py-2 text-caption font-bold',
              value === status
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </nav>
      <EnquiryResults
        query={query}
        empty={
          status
            ? `No ${ENQUIRY_STATUS_LABELS[status].toLowerCase()} enquiries.`
            : 'No enquiries yet.'
        }
        view="owner"
      />
    </div>
  );
}

function EnquiryResults({
  query,
  empty,
  view,
}: {
  query: EnquiryQuery;
  empty: string;
  view: 'buyer' | 'owner';
}) {
  const enquiries = useMemo(() => flattenPages(query.data), [query.data]);
  if (query.isPending) {
    return (
      <div aria-busy="true" className="space-y-3">
        {[0, 1, 2].map((n) => (
          <Skeleton key={n} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }
  if (query.isError) {
    return (
      <p role="alert" className="text-caption text-destructive">
        {errorMessage(query.error)}
      </p>
    );
  }
  if (enquiries.length === 0) {
    return <p className="py-8 text-center text-caption text-muted-foreground">{empty}</p>;
  }
  return (
    <div className="space-y-3">
      <ul aria-label="Enquiries" className="space-y-3">
        {enquiries.map((enquiry) => (
          <li key={enquiry.id}>
            <EnquiryCard enquiry={enquiry} view={view} />
          </li>
        ))}
      </ul>
      {query.hasNextPage && (
        <div className="text-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        </div>
      )}
    </div>
  );
}

function EnquiryCard({ enquiry, view }: { enquiry: Enquiry; view: 'buyer' | 'owner' }) {
  const client = useQueryClient();
  const { showToast } = useApp();
  const close = useMutation({
    mutationFn: () => chatApi.closeEnquiry(enquiry.id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['enquiries'] });
      void client.invalidateQueries({ queryKey: chatKeys.thread(enquiry.conversationId) });
      showToast('Enquiry closed.', 'info');
    },
    onError: (error) => showToast(errorMessage(error), 'error'),
  });
  const listing = enquiry.listing ? toListingCardView(enquiry.listing) : null;
  const quantity = quantityText(enquiry.quantity, enquiry.unit);
  const who = view === 'owner' ? enquiry.buyer.name : enquiry.business.name;

  return (
    <article
      aria-label={`Enquiry from ${enquiry.buyer.name}`}
      className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs"
    >
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h3 className="text-body-sm font-bold text-foreground">{who}</h3>
          <p className="text-caption font-semibold text-primary">
            {listing ? (
              <Link href={listing.href} className="hover:underline">
                {listing.title}
              </Link>
            ) : (
              'Listing no longer available'
            )}
            {quantity && ` · Qty ${quantity}`}
          </p>
          {enquiry.deliveryCity && (
            <p className="flex items-center gap-1 text-caption text-muted-foreground">
              <MapPin aria-hidden className="size-3" />
              Deliver to {enquiry.deliveryCity.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge className={STATUS_STYLES[enquiry.status]}>
            {ENQUIRY_STATUS_LABELS[enquiry.status]}
          </Badge>
          <time dateTime={enquiry.createdAt} className="text-caption text-muted-foreground">
            {formatInboxTime(enquiry.createdAt)}
          </time>
        </div>
      </div>
      <p className="rounded-lg bg-muted p-3 text-caption break-words whitespace-pre-line text-foreground">
        {enquiry.message}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2 text-caption">
        <span className="text-muted-foreground">
          {view === 'owner' && enquiry.buyerPhone ? (
            <a
              href={`tel:${enquiry.buyerPhone}`}
              className="inline-flex items-center gap-1 font-semibold text-foreground"
            >
              <Phone aria-hidden className="size-3.5" />
              {enquiry.buyerPhone}
            </a>
          ) : view === 'buyer' && enquiry.sharePhone ? (
            'You shared your phone number'
          ) : (
            'Phone not shared'
          )}
        </span>
        <span className="flex items-center gap-2">
          {view === 'owner' && enquiry.status !== 'closed' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" disabled={close.isPending}>
                  Close
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Close this enquiry?</AlertDialogTitle>
                  <AlertDialogDescription>
                    It moves to Closed and stays closed, even if you reply later. The chat stays
                    open.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => close.mutate()}>
                    Close enquiry
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button asChild size="sm">
            <Link href={`/messages/${enquiry.conversationId}`}>
              <MessageSquare aria-hidden />
              {view === 'owner' ? 'Reply' : 'Open chat'}
            </Link>
          </Button>
        </span>
      </div>
    </article>
  );
}
