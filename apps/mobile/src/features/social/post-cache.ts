import type { InfiniteData, QueryClient } from '@tanstack/react-query';
import type { Page, Post } from '@supporters/shared';
import { POST_CACHE_FAMILIES } from './query-keys';

type PostPatch = (post: Post) => Post;

function isPost(value: unknown): value is Post {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'likeCount' in value &&
    'isLiked' in value
  );
}

function isInfinite(value: unknown): value is InfiniteData<Page<unknown>> {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as InfiniteData<unknown>).pages)
  );
}

/** A list item is a post (feed, business posts) or a saved item wrapping one. */
function patchItem(item: unknown, postId: string, patch: PostPatch): unknown {
  if (isPost(item)) return item.id === postId ? patch(item) : item;
  if (typeof item === 'object' && item !== null && 'post' in item && isPost(item.post)) {
    return item.post.id === postId ? { ...item, post: patch(item.post) } : item;
  }
  return item;
}

/** Applies `patch` to the post wherever this cached value holds it. Pure, for tests. */
export function patchPostData<T>(data: T, postId: string, patch: PostPatch): T {
  if (isPost(data)) return (data.id === postId ? patch(data) : data) as T;
  if (!isInfinite(data)) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      data: page.data.map((item) => patchItem(item, postId, patch)),
    })),
  } as T;
}

/** Patches the post in every feed, post and saves cache. */
export function updatePostInCaches(queryClient: QueryClient, postId: string, patch: PostPatch) {
  for (const queryKey of POST_CACHE_FAMILIES) {
    queryClient.setQueriesData({ queryKey }, (data: unknown) =>
      data === undefined ? data : patchPostData(data, postId, patch),
    );
  }
}

/** The first cached copy of a post, to know its state before an optimistic change. */
export function findCachedPost(queryClient: QueryClient, postId: string): Post | undefined {
  for (const queryKey of POST_CACHE_FAMILIES) {
    for (const [, data] of queryClient.getQueriesData({ queryKey })) {
      let found: Post | undefined;
      patchPostData(data, postId, (post) => {
        found = post;
        return post;
      });
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Stops in-flight refetches so they can't overwrite an optimistic change. Queries
 * still loading for the first time are left alone: cancelling those would leave
 * them pending with nothing to show.
 */
export async function cancelPostQueries(queryClient: QueryClient) {
  await Promise.all(
    POST_CACHE_FAMILIES.map((queryKey) =>
      queryClient.cancelQueries({ queryKey, predicate: (query) => query.state.data !== undefined }),
    ),
  );
}
