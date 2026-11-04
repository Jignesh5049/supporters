import type { PostStatus, SaveTargetType } from '@supporters/shared';

/**
 * Query keys for posts and the social graph. The first segment is a family:
 * every cache that can hold a post sits under `feed`, `posts` or `saves`,
 * so a like or save can patch them all (see post-cache.ts).
 */
export const socialKeys = {
  feed: (viewer: string) => ['feed', viewer] as const,
  posts: ['posts'] as const,
  post: (id: string) => ['posts', 'detail', id] as const,
  businessPosts: (businessId: string) => ['posts', 'business', businessId] as const,
  myPosts: (status?: PostStatus) => ['posts', 'mine', status ?? 'all'] as const,
  comments: (postId: string, parentId?: string) => ['comments', postId, parentId ?? 'top'] as const,
  saves: ['saves'] as const,
  savesOfType: (type?: SaveTargetType) => ['saves', type ?? 'all'] as const,
  following: ['following'] as const,
  followers: (businessId: string) => ['followers', businessId] as const,
};

/** Caches that may contain a post (detail, pages of posts, or pages of saved items). */
export const POST_CACHE_FAMILIES = [['feed'], socialKeys.posts, socialKeys.saves] as const;
