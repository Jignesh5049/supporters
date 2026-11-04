import type { FollowState, Page, Post, SavedItem, SaveTargetType } from '@supporters/shared';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';

/**
 * Query keys and the cache updates behind the optimistic like, save and
 * follow buttons. Kept free of React so the logic is unit-tested on a plain
 * `QueryClient`.
 *
 * Every query that holds posts lives under `['social', ...]`, so one like
 * updates the post wherever it shows: the feed, its own page, a business's
 * Posts tab and the Saved list.
 */
export const socialKeys = {
  all: ['social'] as const,
  feed: (city: string | null) => ['social', 'feed', city] as const,
  post: (id: string) => ['social', 'post', id] as const,
  businessPosts: (businessId: string) => ['social', 'business-posts', businessId] as const,
  saves: (type: SaveTargetType | null) => ['social', 'saves', type] as const,
  comments: (postId: string, parentId: string | null) => ['comments', postId, parentId] as const,
  follow: (businessId: string) => ['follow', businessId] as const,
  following: ['following'] as const,
  followers: (businessId: string) => ['followers', businessId] as const,
};

type PostUpdate = (post: Post) => Post;

function isPost(value: unknown): value is Post {
  return typeof value === 'object' && value !== null && 'likeCount' in value && 'id' in value;
}

function isSavedPost(value: unknown): value is Extract<SavedItem, { type: 'post' }> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'post' &&
    'post' in value
  );
}

function isInfinite(value: unknown): value is InfiniteData<Page<unknown>> {
  return typeof value === 'object' && value !== null && 'pages' in value && 'pageParams' in value;
}

function updateItem(item: unknown, postId: string, update: PostUpdate): unknown {
  if (isPost(item)) return item.id === postId ? update(item) : item;
  if (isSavedPost(item) && item.post.id === postId) return { ...item, post: update(item.post) };
  return item;
}

/**
 * Applies `update` to the post `postId` inside any cached shape: one post, a
 * page, or infinite pages of posts, feed items or saved items. Returns the
 * same reference when nothing changed, so untouched queries don't re-render.
 */
export function updatePostIn<T>(data: T, postId: string, update: PostUpdate): T {
  if (data === undefined || data === null) return data;
  if (isPost(data)) return updateItem(data, postId, update) as T;
  const updatePage = (page: Page<unknown>): Page<unknown> => {
    let changed = false;
    const items = page.data.map((item) => {
      const next = updateItem(item, postId, update);
      if (next !== item) changed = true;
      return next;
    });
    return changed ? { ...page, data: items } : page;
  };
  if (isInfinite(data)) {
    const pages = data.pages.map(updatePage);
    return pages.some((page, i) => page !== data.pages[i]) ? ({ ...data, pages } as T) : data;
  }
  if (typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
    return updatePage(data as unknown as Page<unknown>) as T;
  }
  return data;
}

export function updatePostEverywhere(client: QueryClient, postId: string, update: PostUpdate) {
  client.setQueriesData({ queryKey: socialKeys.all }, (data: unknown) =>
    updatePostIn(data, postId, update),
  );
}

/** The like as the viewer expects it to land: the flag flips and the count follows. */
export function withLike(post: Post, isLiked: boolean): Post {
  if (post.isLiked === isLiked) return post;
  return { ...post, isLiked, likeCount: Math.max(0, post.likeCount + (isLiked ? 1 : -1)) };
}

export function withSave(post: Post, isSaved: boolean): Post {
  if (post.isSaved === isSaved) return post;
  return { ...post, isSaved, saveCount: Math.max(0, post.saveCount + (isSaved ? 1 : -1)) };
}

/**
 * The optimistic like: `apply` before the request, `rollback` if it fails,
 * `settle` with the API's own count once it succeeds. Rollback and settle only
 * touch the post while it still shows this toggle, so a quick second tap
 * whose request is still in flight is never overwritten.
 */
export function likeUpdates(client: QueryClient, postId: string, isLiked: boolean) {
  return {
    apply: () => updatePostEverywhere(client, postId, (post) => withLike(post, isLiked)),
    rollback: () =>
      updatePostEverywhere(client, postId, (post) =>
        post.isLiked === isLiked ? withLike(post, !isLiked) : post,
      ),
    settle: (state: { isLiked: boolean; likeCount: number }) =>
      updatePostEverywhere(client, postId, (post) =>
        post.isLiked === state.isLiked ? { ...post, likeCount: state.likeCount } : post,
      ),
  };
}

export function saveUpdates(client: QueryClient, postId: string, isSaved: boolean) {
  return {
    apply: () => updatePostEverywhere(client, postId, (post) => withSave(post, isSaved)),
    rollback: () =>
      updatePostEverywhere(client, postId, (post) =>
        post.isSaved === isSaved ? withSave(post, !isSaved) : post,
      ),
  };
}

export function withFollow(state: FollowState, isFollowing: boolean): FollowState {
  if (state.isFollowing === isFollowing) return state;
  return {
    isFollowing,
    followerCount: Math.max(0, state.followerCount + (isFollowing ? 1 : -1)),
  };
}

/** The same optimistic pattern for one business's follow button. */
export function followUpdates(client: QueryClient, businessId: string, isFollowing: boolean) {
  const key = socialKeys.follow(businessId);
  const update = (fn: (state: FollowState) => FollowState) =>
    client.setQueryData<FollowState>(key, (state) => (state ? fn(state) : state));
  return {
    apply: () => update((state) => withFollow(state, isFollowing)),
    rollback: () =>
      update((state) =>
        state.isFollowing === isFollowing ? withFollow(state, !isFollowing) : state,
      ),
    settle: (server: FollowState) =>
      update((state) => (state.isFollowing === server.isFollowing ? server : state)),
  };
}
