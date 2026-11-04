'use client';

import type { FeedItem, Page } from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { Skeleton } from '@supporters/ui-web/components/skeleton';
import { Sparkles, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { EmptyPanel } from '@/components/catalog/empty-panel';
import { PostCard } from './post-card';
import { withSignUpPrompts } from './post-mappers';
import { flattenPages, useFeed, useLoadMoreSentinel } from './use-feed';
import { useFeedSeen } from './use-feed-seen';

interface HomeFeedProps {
  initialPage: Page<FeedItem>;
  isSignedIn: boolean;
  /** The guest's chosen city; null is All India (and always null when signed in). */
  city: string | null;
}

/** The home feed: the server-rendered first page, then infinite scroll on the cursor. */
export function HomeFeed({ initialPage, isSignedIn, city }: HomeFeedProps) {
  const feed = useFeed(city, initialPage);
  const posts = flattenPages(feed.data);
  const observeSeen = useFeedSeen(isSignedIn);
  const sentinel = useLoadMoreSentinel(
    () => void feed.fetchNextPage(),
    feed.hasNextPage && !feed.isFetchingNextPage && !feed.isFetchNextPageError,
  );

  if (posts.length === 0) {
    return (
      <EmptyPanel
        icon={Sparkles}
        title="No posts yet"
        description={
          isSignedIn
            ? 'Follow businesses to see their updates here first.'
            : 'Updates from businesses on Supporters will show here.'
        }
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/discover">Discover businesses</Link>
          </Button>
        }
      />
    );
  }

  const rows = isSignedIn
    ? posts.map((item) => ({ kind: 'item' as const, item }))
    : withSignUpPrompts(posts);

  return (
    <div className="space-y-4">
      <ul className="space-y-4" aria-label="Feed">
        {rows.map((row) =>
          row.kind === 'item' ? (
            <li key={row.item.id} ref={observeSeen} data-post-id={row.item.id}>
              <PostCard post={row.item} isSignedIn={isSignedIn} />
            </li>
          ) : (
            <li key={row.key}>
              <SignUpPrompt />
            </li>
          ),
        )}
      </ul>

      <div ref={sentinel} aria-hidden className="h-px" />
      {feed.isFetchingNextPage && <FeedSkeleton />}
      {feed.isFetchNextPageError && (
        <div role="alert" className="flex items-center justify-center gap-3 text-body-sm">
          <span className="text-muted-foreground">Could not load more posts.</span>
          <Button type="button" variant="outline" size="sm" onClick={() => feed.fetchNextPage()}>
            Try again
          </Button>
        </div>
      )}
      {!feed.hasNextPage && (
        <p className="py-4 text-center text-caption text-muted-foreground">
          You&rsquo;re all caught up.
        </p>
      )}
    </div>
  );
}

/** Shown to guests after every 10 posts (product spec, Home feed for guests). */
function SignUpPrompt() {
  return (
    <aside className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-border bg-primary-soft p-4 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <UserPlus className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-body-sm font-bold text-foreground">Join Supporters</p>
          <p className="text-caption text-muted-foreground">
            Follow businesses, save posts and message suppliers directly.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button asChild size="sm">
          <Link href="/register">Sign up free</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </aside>
  );
}

export function FeedSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5" aria-hidden>
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <Skeleton className="aspect-video w-full" />
    </div>
  );
}
