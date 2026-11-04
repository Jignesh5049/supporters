import {
  commentSchema,
  createCommentSchema,
  feedItemSchema,
  feedSeenSchema,
  followStateSchema,
  followerItemSchema,
  followingItemSchema,
  pageSchema,
  saveStateSchema,
  savedItemSchema,
  type Comment,
  type CreateCommentInput,
  type FeedItem,
  type FollowState,
  type FollowerItem,
  type FollowingItem,
  type Page,
  type SaveState,
  type SaveTargetType,
  type SavedItem,
} from '@supporters/shared';
import type { ApiClient } from './client';
import type { PageQuery } from './posts';
import { seg, toQueryString } from './query-string';

export interface FeedQuery extends PageQuery {
  /** Guests only: a city id. Signed-in users get their own feed. */
  city?: string;
}

export interface CommentsQuery extends PageQuery {
  /** Replies of this top-level comment; without it, top-level comments. */
  parentId?: string;
}

export interface SavesQuery extends PageQuery {
  type?: SaveTargetType;
}

export interface SocialApi {
  feed(query?: FeedQuery): Promise<Page<FeedItem>>;
  markSeen(postIds: string[]): Promise<void>;

  comments(postId: string, query?: CommentsQuery): Promise<Page<Comment>>;
  addComment(postId: string, data: CreateCommentInput): Promise<Comment>;
  removeComment(id: string): Promise<void>;

  setSaved(type: SaveTargetType, id: string, isSaved: boolean): Promise<SaveState>;
  saves(query?: SavesQuery): Promise<Page<SavedItem>>;

  setFollowing(businessId: string, isFollowing: boolean): Promise<FollowState>;
  following(query?: PageQuery): Promise<Page<FollowingItem>>;
  followers(businessId: string, query?: PageQuery): Promise<Page<FollowerItem>>;
}

export function createSocialApi(client: ApiClient): SocialApi {
  return {
    feed: (query = {}) =>
      client.request(`/feed${toQueryString({ ...query })}`, { schema: pageSchema(feedItemSchema) }),
    markSeen: (postIds) =>
      client.request('/feed/seen', { method: 'POST', body: feedSeenSchema.parse({ postIds }) }),

    comments: (postId, query = {}) =>
      client.request(`/posts/${seg(postId)}/comments${toQueryString({ ...query })}`, {
        schema: pageSchema(commentSchema),
        auth: false,
      }),
    addComment: (postId, data) =>
      client.request(`/posts/${seg(postId)}/comments`, {
        method: 'POST',
        body: createCommentSchema.parse(data),
        schema: commentSchema,
      }),
    removeComment: (id) => client.request(`/comments/${seg(id)}`, { method: 'DELETE' }),

    setSaved: (type, id, isSaved) =>
      client.request(`/saves/${seg(type)}/${seg(id)}`, {
        method: isSaved ? 'PUT' : 'DELETE',
        schema: saveStateSchema,
      }),
    saves: (query = {}) =>
      client.request(`/me/saves${toQueryString({ ...query })}`, {
        schema: pageSchema(savedItemSchema),
      }),

    setFollowing: (businessId, isFollowing) =>
      client.request(`/follows/${seg(businessId)}`, {
        method: isFollowing ? 'PUT' : 'DELETE',
        schema: followStateSchema,
      }),
    following: (query = {}) =>
      client.request(`/me/following${toQueryString({ ...query })}`, {
        schema: pageSchema(followingItemSchema),
      }),
    followers: (businessId, query = {}) =>
      client.request(`/businesses/${seg(businessId)}/followers${toQueryString({ ...query })}`, {
        schema: pageSchema(followerItemSchema),
        auth: false,
      }),
  };
}
