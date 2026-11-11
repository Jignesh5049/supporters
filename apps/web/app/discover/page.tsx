import { Compass } from 'lucide-react';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EmptyPanel } from '@/components/catalog/empty-panel';
import { getCategories } from '@/dal/reference';
import { getDiscover } from '@/dal/search';
import { getSession } from '@/dal/session';
import { DiscoverSearchBox } from '@/features/search/discover-search-box';
import { DiscoverSections } from '@/features/search/discover-sections';
import { ResultsSkeleton } from '@/features/search/search-screen';

export const metadata: Metadata = {
  title: 'Discover businesses',
  description: 'Find manufacturers, wholesalers and service providers across India.',
};

/** Discover: search, categories, and the Trending, Featured, Near you and Suggested rows. */
export default function DiscoverPage({ searchParams }: PageProps<'/discover'>) {
  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-12">
      <header className="space-y-4">
        <h1 className="text-title font-black text-foreground">Discover</h1>
        <DiscoverSearchBox />
      </header>
      <Suspense fallback={<ResultsSkeleton rows={3} />}>
        <Sections searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Sections({
  searchParams,
}: {
  searchParams: PageProps<'/discover'>['searchParams'];
}) {
  // Guests may pass `?city=<id>` for Near you; signed-in viewers get their own city.
  const city = (await searchParams).city;
  const [session, discover, categories] = await Promise.all([
    getSession(),
    getDiscover(typeof city === 'string' ? city : undefined),
    getCategories(),
  ]);
  const isEmpty =
    discover.trending.length +
      discover.featured.length +
      discover.nearYou.data.length +
      discover.suggested.length ===
    0;
  return (
    <>
      <DiscoverSections discover={discover} categories={categories} isSignedIn={session !== null} />
      {isEmpty && (
        <EmptyPanel
          icon={Compass}
          title="Nothing to show yet"
          description="As businesses join and grow, the busiest and closest ones show here. Try a search."
        />
      )}
    </>
  );
}
