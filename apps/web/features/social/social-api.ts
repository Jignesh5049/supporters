import {
  type Comment,
  type CreateCommentInput,
  type FeedItem,
  type FollowState,
  type FollowerItem,
  type FollowingItem,
  type LikeState,
  type Page,
  type Post,
  type SaveState,
  type SaveTargetType,
  type SavedItem,
  commentSchema,
  feedItemSchema,
  followStateSchema,
  followerItemSchema,
  followingItemSchema,
  likeStateSchema,
  pageSchema,
  postSchema,
  saveStateSchema,
  savedItemSchema,
} from '@supporters/shared';
import { api } from '@/lib/api/client';

/**
 * Browser calls for the feed and social screens. Reads are validated with the
 * shared schemas; the API authorizes every write and the client adds CSRF.
 */

function withQuery(path: `/v1/${string}`, params: Record<string, string | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  return (query.size > 0 ? `${path}?${query}` : path) as `/v1/${string}`;
}

const feedPage = pageSchema(feedItemSchema);
const postPage = pageSchema(postSchema);
const commentPage = pageSchema(commentSchema);
const savedPage = pageSchema(savedItemSchema);
const followingPage = pageSchema(followingItemSchema);
const followerPage = pageSchema(followerItemSchema);

export const socialApi = {
  feed: async (cursor?: string, city?: string): Promise<Page<FeedItem>> =>
    feedPage.parse(await api.request(withQuery('/v1/feed', { cursor, city }))),

  post: async (postId: string): Promise<Post> =>
    postSchema.parse(await api.request(`/v1/posts/${postId}`)),

  businessPosts: async (businessId: string, cursor?: string): Promise<Page<Post>> =>
    postPage.parse(await api.request(withQuery(`/v1/businesses/${businessId}/posts`, { cursor }))),

  comments: async (postId: string, parentId?: string, cursor?: string): Promise<Page<Comment>> =>
    commentPage.parse(
      await api.request(withQuery(`/v1/posts/${postId}/comments`, { parentId, cursor })),
    ),

  createComment: async (postId: string, body: CreateCommentInput): Promise<Comment> =>
    commentSchema.parse(
      await api.request(`/v1/posts/${postId}/comments`, { method: 'POST', body }),
    ),

  deleteComment: (commentId: string) =>
    api.request(`/v1/comments/${commentId}`, { method: 'DELETE' }),

  setLike: async (postId: string, isLiked: boolean): Promise<LikeState> =>
    likeStateSchema.parse(
      await api.request(`/v1/posts/${postId}/like`, { method: isLiked ? 'PUT' : 'DELETE' }),
    ),

  setSaved: async (type: SaveTargetType, id: string, isSaved: boolean): Promise<SaveState> =>
    saveStateSchema.parse(
      await api.request(`/v1/saves/${type}/${id}`, { method: isSaved ? 'PUT' : 'DELETE' }),
    ),

  saves: async (type?: SaveTargetType, cursor?: string): Promise<Page<SavedItem>> =>
    savedPage.parse(await api.request(withQuery('/v1/me/saves', { type, cursor }))),

  setFollowing: async (businessId: string, isFollowing: boolean): Promise<FollowState> =>
    followStateSchema.parse(
      await api.request(`/v1/follows/${businessId}`, { method: isFollowing ? 'PUT' : 'DELETE' }),
    ),

  following: async (cursor?: string): Promise<Page<FollowingItem>> =>
    followingPage.parse(await api.request(withQuery('/v1/me/following', { cursor }))),

  followers: async (businessId: string, cursor?: string): Promise<Page<FollowerItem>> =>
    followerPage.parse(
      await api.request(withQuery(`/v1/businesses/${businessId}/followers`, { cursor })),
    ),

  markSeen: (postIds: string[]) =>
    api.request('/v1/feed/seen', { method: 'POST', body: { postIds } }),
};
