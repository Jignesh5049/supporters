import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getCategories, getStates } from '@/dal/reference';
import { ResultsSkeleton, SearchScreen } from '@/features/search/search-screen';

// Result lists are endless and personal to the query; the pages they link to are what to index.
export const metadata: Metadata = { title: 'Search', robots: { index: false } };

/** Search: businesses, products, services and posts, with filters and sort. */
export default async function SearchPage() {
  const [categories, states] = await Promise.all([getCategories(), getStates()]);
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="sr-only">Search</h1>
      {/* The screen reads the URL's search params on the client. */}
      <Suspense fallback={<ResultsSkeleton />}>
        <SearchScreen categories={categories} states={states} />
      </Suspense>
    </div>
  );
}
