import { z } from 'zod';
import { MEDIA_LIMITS, TEXT_LIMITS } from '../limits';
import { businessSummarySchema } from './business';
import { moneySchema, paginationQuerySchema } from './common';
import { mediaSchema } from './uploads';

/** Product spec, "Feed and social": only business pages post. */
export const PostType = {
  Product: 'product',
  Service: 'service',
  Update: 'update',
  Offer: 'offer',
  Testimonial: 'testimonial',
} as const;
export type PostType = (typeof PostType)[keyof typeof PostType];
export const postTypeSchema = z.enum(Object.values(PostType));

/** Only published posts are public; drafts and archived posts are the owner's alone. */
export const PostStatus = {
  Draft: 'draft',
  Published: 'published',
  Archived: 'archived',
} as const;
export type PostStatus = (typeof PostStatus)[keyof typeof PostStatus];
export const postStatusSchema = z.enum(Object.values(PostStatus));

/**
 * Ready `post` uploads, in display order: 1 to 10 images or one video. The
 * API checks the image/video split against the stored content types.
 * Published posts need at least one; drafts may have none.
 */
const postMediaIdsSchema = z
  .array(z.uuid())
  .max(MEDIA_LIMITS.imagesPerPost.max)
  .refine((ids) => new Set(ids).size === ids.length, { message: 'Each file may appear once' });

const bodySchema = z.string().trim().max(TEXT_LIMITS.postBody.max);
const offerTagSchema = z.string().trim().min(1).max(TEXT_LIMITS.offerTag.max);
const offerEndsAtSchema = z.iso.datetime({ offset: true });

interface PostShape {
  type?: PostType | undefined;
  offerTag?: string | null | undefined;
  offerEndsAt?: string | null | undefined;
  productId?: string | null | undefined;
  serviceId?: string | null | undefined;
}

/**
 * Rules that span fields. Offer details belong to offers only, a post links at
 * most one listing, and product and service posts link their own kind.
 * Updates are checked again by the API once merged with the stored post.
 */
export function postShapeIssues(post: PostShape): { path: string; message: string }[] {
  const issues: { path: string; message: string }[] = [];
  if (post.type !== undefined && post.type !== PostType.Offer) {
    if (post.offerTag) issues.push({ path: 'offerTag', message: 'Only offers have an offer tag' });
    if (post.offerEndsAt) {
      issues.push({ path: 'offerEndsAt', message: 'Only offers have an end date' });
    }
  }
  if (post.type === PostType.Offer && !post.offerTag) {
    issues.push({ path: 'offerTag', message: 'Offers need an offer tag, such as "20% off"' });
  }
  if (post.productId && post.serviceId) {
    issues.push({ path: 'serviceId', message: 'Attach a product or a service, not both' });
  }
  if (post.type === PostType.Product && post.serviceId) {
    issues.push({ path: 'serviceId', message: 'Product posts can only attach a product' });
  }
  if (post.type === PostType.Service && post.productId) {
    issues.push({ path: 'productId', message: 'Service posts can only attach a service' });
  }
  return issues;
}

const addShapeIssues = (post: PostShape, ctx: z.RefinementCtx) => {
  for (const issue of postShapeIssues(post)) {
    ctx.addIssue({ code: 'custom', path: [issue.path], message: issue.message });
  }
};

export const createPostSchema = z
  .strictObject({
    type: postTypeSchema,
    body: bodySchema.default(''),
    offerTag: offerTagSchema.optional(),
    /** Optional end of an offer; must be in the future. */
    offerEndsAt: offerEndsAtSchema.optional(),
    /** A product or service of the same business, shown as a card. */
    productId: z.uuid().optional(),
    serviceId: z.uuid().optional(),
    mediaIds: postMediaIdsSchema.default([]),
    status: postStatusSchema.default(PostStatus.Draft),
  })
  .superRefine(addShapeIssues);
export type CreatePostInput = z.infer<typeof createPostSchema>;

/** Every field optional; `null` clears an optional one. The type can't change. */
export const updatePostSchema = z.strictObject({
  body: bodySchema.optional(),
  offerTag: offerTagSchema.nullable().optional(),
  offerEndsAt: offerEndsAtSchema.nullable().optional(),
  productId: z.uuid().nullable().optional(),
  serviceId: z.uuid().nullable().optional(),
  mediaIds: postMediaIdsSchema.optional(),
  status: postStatusSchema.optional(),
});
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const PostMediaKind = { Image: 'image', Video: 'video' } as const;
export const postMediaSchema = mediaSchema.extend({
  kind: z.enum(Object.values(PostMediaKind)),
});
export type PostMedia = z.infer<typeof postMediaSchema>;

/** The listing card on a post; null once the listing is no longer public. */
export const postAttachmentSchema = z.object({
  type: z.enum(['product', 'service']),
  id: z.uuid(),
  title: z.string(),
  /** Null means "Ask for price". */
  price: moneySchema.nullable(),
  image: mediaSchema.nullable(),
});
export type PostAttachment = z.infer<typeof postAttachmentSchema>;

export const postSchema = z.object({
  id: z.uuid(),
  business: businessSummarySchema,
  type: postTypeSchema,
  body: z.string(),
  offerTag: z.string().nullable(),
  offerEndsAt: z.iso.datetime().nullable(),
  attachment: postAttachmentSchema.nullable(),
  media: z.array(postMediaSchema),
  status: postStatusSchema,
  likeCount: z.number().int(),
  commentCount: z.number().int(),
  saveCount: z.number().int(),
  publishedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type Post = z.infer<typeof postSchema>;

export const postIdParamsSchema = z.strictObject({ id: z.uuid() });

export const myPostsQuerySchema = paginationQuerySchema.extend({
  status: postStatusSchema.optional(),
});
export type MyPostsQuery = z.infer<typeof myPostsQuerySchema>;
