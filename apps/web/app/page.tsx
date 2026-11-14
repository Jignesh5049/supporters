import { Button } from '@supporters/ui-web/components/button';
import { PenSquare } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';
import { z } from 'zod';
import { RightSidebar } from '@/components/layout/RightSidebar';
import { getMyBusiness } from '@/dal/my-business';
import { getSession } from '@/dal/session';
import { getFeedPage } from '@/dal/social';
import { PinnedRequirement } from '@/features/requirements/pinned-requirement';
import { FeedSkeleton, HomeFeed } from '@/features/social/home-feed';

/** The home feed: the first page renders on the server, the rest loads as you scroll. */
export default function HomePage({ searchParams }: PageProps<'/'>) {
  return (
    <div className="flex items-start justify-center gap-6 pb-12">
      <div className="min-w-0 max-w-2xl flex-1 space-y-4">
        <Suspense fallback={<FeedSkeleton />}>
          <Feed searchParams={searchParams} />
        </Suspense>
      </div>
      <RightSidebar />
    </div>
  );
}

async function Feed({ searchParams }: { searchParams: PageProps<'/'>['searchParams'] }) {
  const session = await getSession();
  // Guests may pick a city (`?city=<id>`); signed-in viewers get their own feed.
  const cityParam = (await searchParams).city;
  const parsedCity = z.uuid().safeParse(cityParam);
  const city = !session && parsedCity.success ? parsedCity.data : null;
  const firstPage = await getFeedPage(city ?? undefined);
  // Sellers see the newest buyer requirement matched to their business pinned on top.
  const hasBusiness = session !== null && (await getMyBusiness()) !== null;

  return (
    <>
      {session && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs">
          <p className="text-body-sm text-muted-foreground">
            Share an update, offer or new product with your followers.
          </p>
          <Button asChild size="sm">
            <Link href="/create">
              <PenSquare aria-hidden />
              Create post
            </Link>
          </Button>
        </div>
      )}
      {hasBusiness && <PinnedRequirement />}
      <HomeFeed initialPage={firstPage} isSignedIn={session !== null} city={city} />
    </>
  );
}
