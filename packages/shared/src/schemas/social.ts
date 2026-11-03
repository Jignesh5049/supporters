import { z } from 'zod';
import { FEED_LIMITS, TEXT_LIMITS } from '../limits';
import { businessSummarySchema } from './business';
import { paginationQuerySchema } from './common';
import { productSchema, serviceSchema } from './listings';
import { postSchema } from './posts';

/** A user as shown next to their comments and in follower lists. */
export const userRefSchema = z.object({ id: z.uuid(), name: z.string() });
export type UserRef = z.infer<typeof userRefSchema>;

// Comments (product spec, Feed and social: text only, one level of replies).

export const createCommentSchema = z.strictObject({
  body: z.string().trim().min(1).max(TEXT_LIMITS.comment.max),
  /** A top-level comment of the same post; replies to replies are rejected. */
  parentId: z.uuid().optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

/** Top-level comments, or the replies of `parentId`, newest first. */
export const commentsQuerySchema = paginationQuerySchema.extend({
  parentId: z.uuid().optional(),
});
export type CommentsQuery = z.infer<typeof commentsQuerySchema>;

export const commentSchema = z.object({
  id: z.uuid(),
  postId: z.uuid(),
  parentId: z.uuid().nullable(),
  body: z.string(),
  author: userRefSchema,
  /** Written by the owner of the post's business. */
  isByBusiness: z.boolean(),
  replyCount: z.number().int(),
  createdAt: z.iso.datetime(),
});
export type Comment = z.infer<typeof commentSchema>;

export const commentIdParamsSchema = z.strictObject({ id: z.uuid() });

// Likes

export const likeStateSchema = z.object({ isLiked: z.boolean(), likeCount: z.number().int() });
export type LikeState = z.infer<typeof likeStateSchema>;

// Saves (product spec, Discovery: "Saved").

export const SaveTargetType = {
  Post: 'post',
  Product: 'product',
  Service: 'service',
  Business: 'business',
} as const;
export type SaveTargetType = (typeof SaveTargetType)[keyof typeof SaveTargetType];
export const saveTargetTypeSchema = z.enum(Object.values(SaveTargetType));

export const saveParamsSchema = z.strictObject({ type: saveTargetTypeSchema, id: z.uuid() });

export const saveStateSchema = z.object({ isSaved: z.boolean() });
export type SaveState = z.infer<typeof saveStateSchema>;

export const savesQuerySchema = paginationQuerySchema.extend({
  type: saveTargetTypeSchema.optional(),
});
export type SavesQuery = z.infer<typeof savesQuerySchema>;

const savedBase = { id: z.uuid(), savedAt: z.iso.datetime() };

/** One saved item. Items whose target is no longer public are left out of the page. */
export const savedItemSchema = z.discriminatedUnion('type', [
  z.object({ ...savedBase, type: z.literal('post'), post: postSchema }),
  z.object({ ...savedBase, type: z.literal('product'), product: productSchema }),
  z.object({ ...savedBase, type: z.literal('service'), service: serviceSchema }),
  z.object({ ...savedBase, type: z.literal('business'), business: businessSummarySchema }),
]);
export type SavedItem = z.infer<typeof savedItemSchema>;

// Follows (product spec, Decisions 2: users follow businesses only).

export const followParamsSchema = z.strictObject({ businessId: z.uuid() });

export const followStateSchema = z.object({
  isFollowing: z.boolean(),
  followerCount: z.number().int(),
});
export type FollowState = z.infer<typeof followStateSchema>;

export const followingItemSchema = z.object({
  business: businessSummarySchema,
  followedAt: z.iso.datetime(),
});
export type FollowingItem = z.infer<typeof followingItemSchema>;

export const followerItemSchema = z.object({
  user: userRefSchema,
  followedAt: z.iso.datetime(),
});
export type FollowerItem = z.infer<typeof followerItemSchema>;

// Feed

/** Why a post is in the feed: a followed business, the viewer's city or state, or anywhere. */
export const FeedSource = {
  Following: 'following',
  City: 'city',
  State: 'state',
  AllIndia: 'all_india',
} as const;
export type FeedSource = (typeof FeedSource)[keyof typeof FeedSource];

export const feedItemSchema = postSchema.extend({
  source: z.enum(Object.values(FeedSource)),
});
export type FeedItem = z.infer<typeof feedItemSchema>;

/** Guests pick a city (default All India); signed-in users get their own feed. 20 per page. */
export const feedQuerySchema = paginationQuerySchema.extend({
  city: z.uuid().optional(),
});
export type FeedQuery = z.infer<typeof feedQuerySchema>;

/** Posts the client showed on screen, so the fill part of the feed skips them. */
export const feedSeenSchema = z.strictObject({
  postIds: z
    .array(z.uuid())
    .min(1)
    .max(FEED_LIMITS.seenBatchMax)
    .transform((ids) => [...new Set(ids)]),
});
export type FeedSeenInput = z.infer<typeof feedSeenSchema>;
