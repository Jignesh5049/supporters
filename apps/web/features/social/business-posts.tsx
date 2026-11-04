'use client';

import type { Page, Post } from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { EmptyPanel } from '@/components/catalog/empty-panel';
import { PostCard } from './post-card';
import { socialKeys } from './post-cache';
import { socialApi } from './social-api';
import { cursorListOptions, flattenPages } from './use-feed';

interface BusinessPostsProps {
  businessId: string;
  initialPage: Page<Post>;
  isSignedIn: boolean;
}

/** The Posts tab on a business page. */
export function BusinessPosts({ businessId, initialPage, isSignedIn }: BusinessPostsProps) {
  const posts = useInfiniteQuery(
    cursorListOptions(
      socialKeys.businessPosts(businessId),
      (cursor) => socialApi.businessPosts(businessId, cursor),
      initialPage,
    ),
  );
  const items = flattenPages(posts.data);
  if (items.length === 0) {
    return (
      <EmptyPanel
        icon={Sparkles}
        title="No posts yet"
        description="Updates from this business will show here."
      />
    );
  }
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <ul className="space-y-4">
        {items.map((post) => (
          <li key={post.id}>
            <PostCard post={post} isSignedIn={isSignedIn} />
          </li>
        ))}
      </ul>
      {posts.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          disabled={posts.isFetchingNextPage}
          onClick={() => posts.fetchNextPage()}
        >
          {posts.isFetchingNextPage ? 'Loading…' : 'Load more posts'}
        </Button>
      )}
    </div>
  );
}
