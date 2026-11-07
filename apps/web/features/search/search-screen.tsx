'use client';

import type { CategoryTree, SearchType, State } from '@supporters/shared';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { Label } from '@supporters/ui-web/components/label';
import { NativeSelect, NativeSelectOption } from '@supporters/ui-web/components/native-select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@supporters/ui-web/components/sheet';
import { Skeleton } from '@supporters/ui-web/components/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@supporters/ui-web/components/tabs';
import { SearchX, SlidersHorizontal } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useId, useMemo } from 'react';
import { EmptyPanel } from '@/components/catalog/empty-panel';
import { useLoadMoreSentinel } from '@/features/social/use-feed';
import { FilterPanel } from './filter-panel';
import { SearchHitCard } from './result-cards';
import { SearchBox } from './search-box';
import {
  type SearchState,
  TYPE_TABS,
  activeFilterCount,
  clearFilters,
  parseSearchState,
  sortOptions,
  toSearchParams,
  withType,
} from './search-params';
import { flattenHits, hitId, useSearchResults } from './use-search';

interface SearchScreenProps {
  categories: CategoryTree[];
  states: State[];
}

/** `/search`: the box, type tabs, filters and sort, all mirrored in the URL. */
export function SearchScreen({ categories, states }: SearchScreenProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const state = useMemo(() => parseSearchState(new URLSearchParams(params)), [params]);
  const sortId = useId();

  const navigate = (next: SearchState) => {
    const query = toSearchParams(next).toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const results = useSearchResults(state);
  const hits = flattenHits(results.data);
  const total = results.data?.pages[0]?.estimatedTotal ?? 0;
  const sentinel = useLoadMoreSentinel(
    () => void results.fetchNextPage(),
    results.hasNextPage && !results.isFetchingNextPage && !results.isFetchNextPageError,
  );
  const filterCount = activeFilterCount(state);
  const filters = (
    <FilterPanel state={state} categories={categories} states={states} onChange={navigate} />
  );

  return (
    <div className="space-y-5 pb-12">
      <SearchBox
        // Remount when the URL's text changes (Back, a new search from the header).
        key={state.q}
        size="lg"
        initialQuery={state.q}
        onSubmit={(q) => navigate({ ...state, q })}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={state.type}
          onValueChange={(type) => navigate(withType(state, type as SearchType))}
        >
          <TabsList aria-label="Result type">
            {TYPE_TABS.map((tab) => (
              <TabsTrigger key={tab.type} value={tab.type}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Label htmlFor={sortId} className="text-caption text-muted-foreground">
            Sort
          </Label>
          <NativeSelect
            id={sortId}
            className="w-44"
            value={state.sort}
            onChange={(event) =>
              navigate({ ...state, sort: event.target.value as SearchState['sort'] })
            }
          >
            {sortOptions(state.type).map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <SlidersHorizontal aria-hidden />
                Filters
                {filterCount > 0 && <Badge>{filterCount}</Badge>}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="overflow-y-auto p-4">
              <SheetHeader className="sr-only">
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              {filters}
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="flex items-start gap-6">
        <aside className="hidden w-64 shrink-0 rounded-2xl border border-border bg-card p-4 lg:block">
          {filters}
        </aside>

        <section
          className="min-w-0 flex-1 space-y-4"
          aria-label="Results"
          aria-busy={results.isFetching}
        >
          {results.isPending ? (
            <ResultsSkeleton />
          ) : results.isError ? (
            <EmptyPanel
              icon={SearchX}
              title="Search isn't available right now"
              description="Please try again in a moment."
              action={
                <Button variant="outline" size="sm" onClick={() => void results.refetch()}>
                  Try again
                </Button>
              }
            />
          ) : hits.length === 0 ? (
            <EmptyPanel
              icon={SearchX}
              title="No results"
              description={
                filterCount > 0
                  ? 'Nothing matches these filters. Try removing some.'
                  : 'Try other words, or check the spelling.'
              }
              action={
                filterCount > 0 ? (
                  <Button variant="outline" size="sm" onClick={() => navigate(clearFilters(state))}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <p className="text-caption text-muted-foreground" aria-live="polite">
                {total >= 1000 ? '1,000+' : total} {total === 1 ? 'result' : 'results'}
              </p>
              <ul
                className={
                  state.type === 'business' || state.type === 'post'
                    ? 'grid gap-4 sm:grid-cols-2'
                    : 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3'
                }
              >
                {hits.map((hit) => (
                  <li key={hitId(hit)} className="flex">
                    <div className="flex w-full flex-col [&>article]:flex-1">
                      <SearchHitCard hit={hit} />
                    </div>
                  </li>
                ))}
              </ul>
              <div ref={sentinel} aria-hidden />
              {results.isFetchingNextPage && <ResultsSkeleton rows={1} />}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export function ResultsSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-hidden>
      {Array.from({ length: rows * 2 }, (_, index) => (
        <Skeleton key={index} className="h-40 rounded-2xl" />
      ))}
    </div>
  );
}
