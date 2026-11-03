import { Skeleton } from '@supporters/ui-web/components/skeleton';

/**
 * The placeholder a data page streams in behind. Cache Components needs the
 * request-time reads (session, API data, params) inside a `<Suspense>`.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  );
}
