'use client';

import { type Page, type SavedItem, type SaveTargetType } from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { Bookmark } from 'lucide-react';
import Link from 'next/link';
import { BusinessLogo } from '@/components/catalog/business-logo';
import { EmptyPanel } from '@/components/catalog/empty-panel';
import { ListingCard } from '@/components/catalog/listing-card';
import { businessPath } from '@/lib/catalog/seo';
import { PostCard } from './post-card';
import { socialKeys } from './post-cache';
import { socialApi } from './social-api';
import { cursorListOptions, flattenPages, useLoadMoreSentinel } from './use-feed';
import { useInfiniteQuery } from '@tanstack/react-query';

interface SavedListProps {
  type: SaveTargetType | null;
  initialPage: Page<SavedItem>;
}

/** The Saved list for one type tab: the server's first page, then "Load more". */
export function SavedList({ type, initialPage }: SavedListProps) {
  const saved = useInfiniteQuery(
    cursorListOptions(
      socialKeys.saves(type),
      (cursor) => socialApi.saves(type ?? undefined, cursor),
      initialPage,
    ),
  );
  const items = flattenPages(saved.data);
  const sentinel = useLoadMoreSentinel(
    () => void saved.fetchNextPage(),
    saved.hasNextPage && !saved.isFetchingNextPage,
  );

  if (items.length === 0) {
    return (
      <EmptyPanel
        icon={Bookmark}
        title="Nothing saved yet"
        description="Tap Save on a post, product, service or business to find it here later."
      />
    );
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {items.map((item) => (
          <li key={item.id}>
            <SavedEntry item={item} />
          </li>
        ))}
      </ul>
      <div ref={sentinel} aria-hidden className="h-px" />
      {saved.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          disabled={saved.isFetchingNextPage}
          onClick={() => saved.fetchNextPage()}
        >
          {saved.isFetchingNextPage ? 'Loading…' : 'Load more'}
        </Button>
      )}
    </div>
  );
}

function SavedEntry({ item }: { item: SavedItem }) {
  switch (item.type) {
    case 'post':
      return <PostCard post={item.post} isSignedIn />;
    case 'product':
      return <ListingCard kind="product" listing={item.product} />;
    case 'service':
      return <ListingCard kind="service" listing={item.service} />;
    case 'business':
      return (
        <Link
          href={businessPath(item.business.slug)}
          className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-xs hover:bg-muted"
        >
          <BusinessLogo name={item.business.name} url={item.business.logo?.url} />
          <span>
            <span className="block text-body-sm font-bold text-foreground">
              {item.business.name}
            </span>
            <span className="block text-caption text-muted-foreground">
              {item.business.city.name}
            </span>
          </span>
        </Link>
      );
  }
}
