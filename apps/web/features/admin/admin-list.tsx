'use client';

import { Button } from '@supporters/ui-web/components/button';
import { Skeleton } from '@supporters/ui-web/components/skeleton';
import { cn } from '@supporters/ui-web/lib/utils';
import type { ReactNode } from 'react';
import { errorMessage } from '@/lib/api/errors';

interface PagedQuery {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => unknown;
}

/** Loading, error, empty and "load more" around a paged admin list. */
export function AdminList({
  query,
  isEmpty,
  emptyText,
  children,
}: {
  query: PagedQuery;
  isEmpty: boolean;
  emptyText: string;
  children: ReactNode;
}) {
  if (query.isPending) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <p role="alert" className="text-caption text-destructive">
        {errorMessage(query.error)} If your 8-hour session ended,{' '}
        <a className="underline" href="/admin/login">
          sign in again
        </a>
        .
      </p>
    );
  }
  if (isEmpty) return <p className="text-caption text-muted-foreground">{emptyText}</p>;
  return (
    <div className="space-y-3">
      {children}
      {query.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          disabled={query.isFetchingNextPage}
          onClick={() => query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? 'Loading...' : 'Load more'}
        </Button>
      )}
    </div>
  );
}

/** A row of filter buttons, one pressed. */
export function StatusTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label="Filter" className="flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          aria-pressed={tab.value === value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'min-h-9 rounded-full border px-4 text-caption font-semibold',
            tab.value === value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-card text-foreground hover:bg-muted',
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
