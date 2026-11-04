import 'server-only';
import {
  type Comment,
  type FeedItem,
  type FollowingItem,
  type Page,
  type Post,
  type SavedItem,
  type SaveTargetType,
  PAGINATION,
  commentSchema,
  feedItemSchema,
  followingItemSchema,
  pageSchema,
  postSchema,
  savedItemSchema,
} from '@supporters/shared';
import { cache } from 'react';
import { z } from 'zod';
import { apiGet } from './api-fetch';

/**
 * Feed and social reads. Public reads forward the access cookie when there is
 * one (`withSession: 'optional'`), so posts carry the viewer's own like and save.
 */

const uuid = z.uuid();
const emptyPage = <T>(): Page<T> => ({ data: [], nextCursor: null });

/** The first feed page: the viewer's own feed, or the guest feed (All India or `city`). */
export const getFeedPage = cache(async (city?: string): Promise<Page<FeedItem>> => {
  const query = new URLSearchParams();
  if (city && uuid.safeParse(city).success) query.set('city', city);
  const suffix = query.size > 0 ? `?${query}` : '';
  return (
    (await apiGet(`/v1/feed${suffix}`, pageSchema(feedItemSchema), {
      withSession: 'optional',
    })) ?? emptyPage()
  );
});

/** A published post, or null when the id is malformed or the post isn't public. */
export const getPost = cache(async (id: string): Promise<Post | null> => {
  if (!uuid.safeParse(id).success) return null;
  return apiGet(`/v1/posts/${id}`, postSchema, { withSession: 'optional' });
});

/** Top-level comments of a post, newest first. */
export const listComments = cache(
  async (postId: string): Promise<Page<Comment>> =>
    (await apiGet(`/v1/posts/${postId}/comments`, pageSchema(commentSchema))) ?? emptyPage(),
);

/** A business's Posts tab, newest first. */
export const listBusinessPosts = cache(
  async (businessId: string): Promise<Page<Post>> =>
    (await apiGet(`/v1/businesses/${businessId}/posts`, pageSchema(postSchema), {
      withSession: 'optional',
    })) ?? emptyPage(),
);

/** The viewer's saved items, optionally of one type. Empty when signed out. */
export const listMySaves = cache(async (type?: SaveTargetType): Promise<Page<SavedItem>> => {
  const query = new URLSearchParams();
  if (type) query.set('type', type);
  const suffix = query.size > 0 ? `?${query}` : '';
  return (
    (await apiGet(`/v1/me/saves${suffix}`, pageSchema(savedItemSchema), {
      withSession: true,
    })) ?? emptyPage()
  );
});

export const listMyFollowing = cache(async (cursor?: string): Promise<Page<FollowingItem>> => {
  const query = new URLSearchParams({ limit: String(PAGINATION.maxLimit) });
  if (cursor) query.set('cursor', cursor);
  return (
    (await apiGet(`/v1/me/following?${query}`, pageSchema(followingItemSchema), {
      withSession: true,
    })) ?? emptyPage()
  );
});

/** Pages of 50 scanned for one business; beyond that the button starts as "Follow". */
const MAX_FOLLOWING_PAGES = 4;

/**
 * Whether the signed-in viewer follows a business. The API has no
 * `isFollowing` on the business yet (requested in the PR), so this walks the
 * viewer's following list. False for guests.
 */
export const isFollowingBusiness = cache(async (businessId: string): Promise<boolean> => {
  let cursor: string | undefined;
  for (let i = 0; i < MAX_FOLLOWING_PAGES; i += 1) {
    const page = await listMyFollowing(cursor);
    if (page.data.some((item) => item.business.id === businessId)) return true;
    if (!page.nextCursor) return false;
    cursor = page.nextCursor;
  }
  return false;
});
