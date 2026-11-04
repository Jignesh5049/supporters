'use client';

import type { Post } from '@supporters/shared';
import { useQuery } from '@tanstack/react-query';
import { PostCard } from './post-card';
import { socialKeys } from './post-cache';
import { socialApi } from './social-api';

/**
 * The post on its own page. The server render seeds the query cache, so
 * likes, saves and new comments (which update the cache) show up at once.
 */
export function PostDetail({ post, isSignedIn }: { post: Post; isSignedIn: boolean }) {
  const { data } = useQuery({
    queryKey: socialKeys.post(post.id),
    queryFn: () => socialApi.post(post.id),
    initialData: post,
    staleTime: 60_000,
  });
  return <PostCard post={data} isSignedIn={isSignedIn} variant="detail" />;
}
