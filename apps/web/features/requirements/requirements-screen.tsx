'use client';

import type { Requirement, RequirementStatus } from '@supporters/shared';
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
import { Button } from '@supporters/ui-web/components/button';
import { Skeleton } from '@supporters/ui-web/components/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@supporters/ui-web/components/tabs';
import { cn } from '@supporters/ui-web/lib/utils';
import {
  type InfiniteData,
  type UseInfiniteQueryResult,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { ClipboardList, Inbox, PlusCircle, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { EmptyPanel } from '@/components/catalog/empty-panel';
import { useApp } from '@/context/AppContext';
import { flattenPages } from '@/features/social/use-feed';
import { errorMessage } from '@/lib/api/errors';
import { QuoteDialog } from './quote-dialog';
import { RequirementCard } from './requirement-card';
import { REQUIREMENT_STATUS_LABELS } from './requirement-form-values';
import {
  matchedQueryOptions,
  mineQueryOptions,
  requirementKeys,
  requirementsApi,
} from './requirements-api';

type RequirementQuery = UseInfiniteQueryResult<
  InfiniteData<Awaited<ReturnType<typeof requirementsApi.matched>>, unknown>,
  Error
>;

export interface SellerState {
  hasBusiness: boolean;
  isVerified: boolean;
}

/** `/requirements`: matched requirements for my business, and the ones I posted. */
export function RequirementsScreen({ seller }: { seller: SellerState }) {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get('tab') === 'mine' || !seller.hasBusiness ? 'mine' : 'matched';
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => router.replace(value === 'mine' ? '?tab=mine' : '?')}
      className="gap-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          {seller.hasBusiness && <TabsTrigger value="matched">For your business</TabsTrigger>}
          <TabsTrigger value="mine">My requirements</TabsTrigger>
        </TabsList>
        <Button asChild size="sm">
          <Link href="/requirements/new">
            <PlusCircle aria-hidden />
            Post a requirement
          </Link>
        </Button>
      </div>
      {seller.hasBusiness && (
        <TabsContent value="matched">
          <MatchedList isVerified={seller.isVerified} />
        </TabsContent>
      )}
      <TabsContent value="mine">
        <MyRequirements />
      </TabsContent>
    </Tabs>
  );
}

function MatchedList({ isVerified }: { isVerified: boolean }) {
  const query = useInfiniteQuery(matchedQueryOptions());
  const [quoting, setQuoting] = useState<Requirement | null>(null);
  return (
    <>
      {!isVerified && (
        <p className="mb-4 rounded-xl border border-border bg-warning-soft p-3 text-body-sm text-warning">
          Only verified businesses can quote. Request the badge from the{' '}
          <Link href="/business/manage" className="font-semibold underline">
            Business Hub
          </Link>
          .
        </p>
      )}
      <RequirementList
        query={query}
        empty={
          <EmptyPanel
            icon={Inbox}
            title="No matching requirements"
            description="When a buyer needs something in your category and area, it shows here."
          />
        }
        actions={(requirement) =>
          isVerified && requirement.status === 'open' && !requirement.hasQuoted ? (
            <Button size="sm" onClick={() => setQuoting(requirement)}>
              <Send aria-hidden />
              Send quote
            </Button>
          ) : null
        }
      />
      <QuoteDialog requirement={quoting} onClose={() => setQuoting(null)} />
    </>
  );
}

const FILTERS: { label: string; status: RequirementStatus | null }[] = [
  { label: 'All', status: null },
  { label: REQUIREMENT_STATUS_LABELS.open, status: 'open' },
  { label: REQUIREMENT_STATUS_LABELS.fulfilled, status: 'fulfilled' },
  { label: REQUIREMENT_STATUS_LABELS.closed, status: 'closed' },
  { label: REQUIREMENT_STATUS_LABELS.expired, status: 'expired' },
];

function MyRequirements() {
  const [status, setStatus] = useState<RequirementStatus | null>(null);
  const query = useInfiniteQuery(mineQueryOptions(status));
  return (
    <div className="space-y-4">
      <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Button
            key={filter.label}
            size="sm"
            variant={filter.status === status ? 'default' : 'outline'}
            aria-pressed={filter.status === status}
            onClick={() => setStatus(filter.status)}
          >
            {filter.label}
          </Button>
        ))}
      </div>
      <RequirementList
        query={query}
        empty={
          <EmptyPanel
            icon={ClipboardList}
            title="No requirements here"
            description="Post what you need, and matching suppliers will send you quotes."
          />
        }
        actions={(requirement) => <MyActions requirement={requirement} />}
      />
    </div>
  );
}

/** View quotes, and close or fulfil an open requirement. */
export function MyActions({
  requirement,
  showView = true,
}: {
  requirement: Requirement;
  /** False on the detail page itself. */
  showView?: boolean;
}) {
  const client = useQueryClient();
  const { showToast } = useApp();
  const change = useMutation({
    mutationFn: (status: 'closed' | 'fulfilled') =>
      requirementsApi.setStatus(requirement.id, status),
    onSuccess: (updated) => {
      client.setQueryData(requirementKeys.one(updated.id), updated);
      void client.invalidateQueries({ queryKey: requirementKeys.all });
      showToast(
        updated.status === 'fulfilled' ? 'Marked as fulfilled.' : 'Requirement closed.',
        'success',
      );
    },
    onError: (error) => showToast(errorMessage(error), 'error'),
  });
  return (
    <>
      {showView && (
        <Button asChild size="sm" variant="outline">
          <Link href={`/requirements/${requirement.id}`}>
            {requirement.quoteCount > 0 ? `View ${requirement.quoteCount} quotes` : 'View'}
          </Link>
        </Button>
      )}
      {requirement.status === 'open' && (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={change.isPending}
            onClick={() => change.mutate('fulfilled')}
          >
            Mark fulfilled
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" disabled={change.isPending}>
                Close
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Close this requirement?</AlertDialogTitle>
                <AlertDialogDescription>
                  Suppliers will stop seeing it and can no longer quote. This can’t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Keep it open</AlertDialogCancel>
                <AlertDialogAction onClick={() => change.mutate('closed')}>Close</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
}

function RequirementList({
  query,
  empty,
  actions,
}: {
  query: RequirementQuery;
  empty: ReactNode;
  actions: (requirement: Requirement) => ReactNode;
}) {
  if (query.isPending) return <ListSkeleton />;
  if (query.isError) {
    return (
      <div role="alert" className="flex items-center gap-3 text-body-sm">
        <span className="text-muted-foreground">{errorMessage(query.error)}</span>
        <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </div>
    );
  }
  const requirements = flattenPages(query.data);
  if (requirements.length === 0) return <>{empty}</>;
  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {requirements.map((requirement) => (
          <li key={requirement.id}>
            <RequirementCard requirement={requirement} actions={actions(requirement)} />
          </li>
        ))}
      </ul>
      {query.hasNextPage && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

export function ListSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)} aria-busy aria-label="Loading">
      {[0, 1].map((i) => (
        <Skeleton key={i} className="h-48 w-full rounded-2xl" />
      ))}
    </div>
  );
}
