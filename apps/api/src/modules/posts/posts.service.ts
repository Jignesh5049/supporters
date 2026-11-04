import {
  type CreatePostInput,
  type LikeState,
  type MyPostsQuery,
  type Page,
  type PaginationQuery,
  type Post,
  type PostAttachment,
  type UpdatePostInput,
  postShapeIssues,
} from '@supporters/shared';
import type { Prisma, PrismaClient, Upload } from '../../generated/prisma/client';
import { AppError, ErrorCode, invalidField, isUniqueViolation, notFound } from '../../lib/errors';
import {
  afterTimeCursor,
  decodeTimeCursor,
  encodeTimeCursor,
  pageArgs,
  splitPage,
} from '../../lib/pagination';
import {
  type BusinessesService,
  postsPer7DaysLimit,
  toBusinessSummary,
} from '../businesses/businesses.service';
import { toMoney } from '../listings/listings.service';
import { recordEvent } from '../notifications/outbox';
import type { SaveLookup } from '../saves/saves.service';
import { type MediaUrl, type UploadsService, toMedia } from '../uploads/uploads.service';

const firstImage = {
  media: { orderBy: { position: 'asc' }, take: 1, include: { upload: true } },
} as const;

export const postInclude = {
  business: { include: { logo: true, city: { include: { state: true } } } },
  media: { orderBy: { position: 'asc' }, include: { upload: true } },
  product: { include: firstImage },
  service: { include: firstImage },
} satisfies Prisma.PostInclude;

export type PostRow = Prisma.PostGetPayload<{ include: typeof postInclude }>;

/** Public reads: published, not deleted, and the business owner's account is active. */
export const PUBLIC_POST = {
  // Lets the planner use idx_posts_published_published_at_id (see its comment).
  publishedAt: { not: null },
  status: 'published',
  deletedAt: null,
  business: { owner: { status: 'active' } },
} satisfies Prisma.PostWhereInput;

/** Newest first by first publish time; ids break ties. */
export const PUBLISHED_ORDER = [
  { publishedAt: 'desc' },
  { id: 'desc' },
] satisfies Prisma.PostOrderByWithRelationInput[];

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const postLimitReached = (limit: number) =>
  new AppError(409, ErrorCode.PostLimitReached, 'Weekly post limit reached', {
    detail: `The free plan allows ${limit} posts in any 7 days. Try again later or upgrade to Premium.`,
  });
const needsMedia = () =>
  invalidField('body.mediaIds', 'Add at least one image or a video to publish');
const mediaInUse = () => invalidField('body.mediaIds', 'A file is already used by another post');

const isVideo = (upload: Pick<Upload, 'contentType'>) => upload.contentType.startsWith('video/');

/** 1 to 10 images, or exactly one video (product spec, Feed and social). */
function assertMediaMix(uploads: Upload[]) {
  const videos = uploads.filter(isVideo).length;
  if (videos > 0 && uploads.length > 1) {
    throw invalidField('body.mediaIds', 'Add either images or one video, not both');
  }
}

function assertShape(post: Parameters<typeof postShapeIssues>[0]) {
  const [issue] = postShapeIssues(post);
  if (issue) throw invalidField(`body.${issue.path}`, issue.message);
}

function parseOfferEnd(value: string | null | undefined, now = new Date()) {
  if (value === undefined || value === null) return value;
  const endsAt = new Date(value);
  if (endsAt <= now) throw invalidField('body.offerEndsAt', 'The offer must end in the future');
  return endsAt;
}

interface Attachable {
  productId?: string | null | undefined;
  serviceId?: string | null | undefined;
}

export class PostsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly businesses: BusinessesService,
    private readonly uploads: UploadsService,
    private readonly saved: SaveLookup,
  ) {}

  async getPublic(id: string, viewerId: string | null = null): Promise<Post> {
    const row = await this.prisma.post.findFirst({
      where: { id, ...PUBLIC_POST },
      include: postInclude,
    });
    if (!row) throw notFound();
    return this.one(row, viewerId);
  }

  /** A business's Posts tab. */
  async listPublic(
    businessId: string,
    query: PaginationQuery,
    viewerId: string | null = null,
  ): Promise<Page<Post>> {
    await this.businesses.requirePublicId(businessId);
    const rows = await this.prisma.post.findMany({
      where: { ...PUBLIC_POST, businessId, ...afterTimeCursor(decodeTimeCursor(query.cursor)) },
      orderBy: PUBLISHED_ORDER,
      take: query.limit + 1,
      include: postInclude,
    });
    return this.publishedPage(rows, query.limit, viewerId);
  }

  async listMine(userId: string, query: MyPostsQuery): Promise<Page<Post>> {
    const business = await this.businesses.requireOwned(userId);
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.post.findMany({
      ...page,
      where: {
        ...page.where,
        businessId: business.id,
        deletedAt: null,
        ...(query.status ? { status: query.status } : {}),
      },
      include: postInclude,
    });
    const split = splitPage(rows, query.limit);
    return { data: await this.toPosts(split.rows, userId), nextCursor: split.nextCursor };
  }

  async create(userId: string, input: CreatePostInput): Promise<Post> {
    const business = await this.businesses.requireOwned(userId);
    const offerEndsAt = parseOfferEnd(input.offerEndsAt);
    await this.assertAttachment(business.id, input);
    const uploads = await this.readyMedia(userId, input.mediaIds);
    const isPublishing = input.status === 'published';
    if (isPublishing && uploads.length === 0) throw needsMedia();

    return this.write(business, isPublishing, uploads, (tx) =>
      tx.post.create({
        data: {
          businessId: business.id,
          type: input.type,
          body: input.body,
          offerTag: input.offerTag ?? null,
          offerEndsAt: offerEndsAt ?? null,
          productId: input.productId ?? null,
          serviceId: input.serviceId ?? null,
          status: input.status,
          publishedAt: isPublishing ? new Date() : null,
        },
        select: { id: true },
      }),
    );
  }

  async update(userId: string, id: string, input: UpdatePostInput): Promise<Post> {
    const business = await this.businesses.requireOwned(userId);
    const current = await this.prisma.post.findFirst({
      where: { id, businessId: business.id, deletedAt: null },
    });
    if (!current) throw notFound();

    const pick = <K extends keyof UpdatePostInput, V>(key: K, stored: V) =>
      input[key] !== undefined ? input[key] : stored;
    assertShape({
      type: current.type,
      offerTag: pick('offerTag', current.offerTag),
      offerEndsAt: pick('offerEndsAt', current.offerEndsAt?.toISOString() ?? null),
      productId: pick('productId', current.productId),
      serviceId: pick('serviceId', current.serviceId),
    });

    const data: Prisma.PostUncheckedUpdateInput = {};
    if (input.body !== undefined) data.body = input.body;
    if (input.offerTag !== undefined) data.offerTag = input.offerTag;
    if (input.offerEndsAt !== undefined)
      data.offerEndsAt = parseOfferEnd(input.offerEndsAt) ?? null;
    if (input.productId !== undefined || input.serviceId !== undefined) {
      await this.assertAttachment(business.id, input);
      if (input.productId !== undefined) data.productId = input.productId;
      if (input.serviceId !== undefined) data.serviceId = input.serviceId;
    }

    // Only the first publish counts against the plan; unarchiving keeps the original time.
    const isPublishing = input.status === 'published' && current.publishedAt === null;
    if (input.status !== undefined) data.status = input.status;
    if (isPublishing) data.publishedAt = new Date();

    const uploads = input.mediaIds && (await this.readyMedia(userId, input.mediaIds));
    const willBePublished = (input.status ?? current.status) === 'published';
    if (willBePublished) {
      const mediaCount = uploads
        ? uploads.length
        : await this.prisma.postMedia.count({ where: { postId: id } });
      if (mediaCount === 0) throw needsMedia();
    }

    return this.write(business, isPublishing, uploads, (tx) =>
      tx.post.update({
        where: { id, businessId: business.id, deletedAt: null },
        data,
        select: { id: true },
      }),
    );
  }

  /** Soft delete; the row is purged after 30 days (backend spec, Data model). */
  async remove(userId: string, id: string): Promise<void> {
    const business = await this.businesses.requireOwned(userId);
    const { count } = await this.prisma.post.updateMany({
      where: { id, businessId: business.id, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    if (count === 0) throw notFound();
  }

  /** The id of a public post, for likes, comments and saves. */
  async requirePublicId(id: string): Promise<string> {
    const row = await this.prisma.post.findFirst({
      where: { id, ...PUBLIC_POST },
      select: { id: true },
    });
    if (!row) throw notFound();
    return row.id;
  }

  /**
   * Runs a post write in one transaction. A first publish locks the business
   * row (`FOR UPDATE`) before counting, so two concurrent publishes can't both
   * take the last slot of the week. Media are replaced in the same transaction.
   */
  private async write(
    business: { id: string; premiumUntil: Date | null },
    isPublishing: boolean,
    uploads: Upload[] | undefined,
    mutate: (tx: Prisma.TransactionClient) => Promise<{ id: string }>,
  ): Promise<Post> {
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        if (isPublishing) await this.assertPublishSlot(tx, business);
        const { id } = await mutate(tx);
        if (uploads) await this.replaceMedia(tx, id, uploads);
        return tx.post.findUniqueOrThrow({ where: { id }, include: postInclude });
      });
      return await this.one(row, null);
    } catch (error) {
      // Two posts claiming the same upload at once (uq_post_media_upload_id).
      if (isUniqueViolation(error)) throw mediaInUse();
      throw error;
    }
  }

  /** Publishes in the last 7 days, deleted and archived posts included, so reposting can't dodge it. */
  private async assertPublishSlot(
    tx: Prisma.TransactionClient,
    business: { id: string; premiumUntil: Date | null },
  ) {
    const limit = postsPer7DaysLimit(business);
    if (limit === null) return;
    await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${business.id}::uuid FOR UPDATE`;
    const published = await tx.post.count({
      where: { businessId: business.id, publishedAt: { gt: new Date(Date.now() - WEEK_MS) } },
    });
    if (published >= limit) throw postLimitReached(limit);
  }

  private async readyMedia(userId: string, ids: string[]) {
    const uploads = await this.uploads.requireReady(userId, ids, 'post', 'body.mediaIds');
    assertMediaMix(uploads);
    return uploads;
  }

  private async replaceMedia(tx: Prisma.TransactionClient, postId: string, uploads: Upload[]) {
    const uploadIds = uploads.map((upload) => upload.id);
    const inUse = await tx.postMedia.findMany({
      where: { uploadId: { in: uploadIds }, postId: { not: postId } },
      select: { id: true },
    });
    if (inUse.length > 0) throw mediaInUse();
    await tx.postMedia.deleteMany({ where: { postId } });
    await tx.postMedia.createMany({
      data: uploadIds.map((uploadId, position) => ({ postId, uploadId, position })),
    });
  }

  /** An attached listing must be a live product or service of the same business. */
  private async assertAttachment(businessId: string, input: Attachable) {
    if (input.productId) {
      const product = await this.prisma.product.findFirst({
        where: { id: input.productId, businessId, deletedAt: null },
        select: { id: true },
      });
      if (!product) throw invalidField('body.productId', 'Attach one of your own products');
    }
    if (input.serviceId) {
      const service = await this.prisma.service.findFirst({
        where: { id: input.serviceId, businessId, deletedAt: null },
        select: { id: true },
      });
      if (!service) throw invalidField('body.serviceId', 'Attach one of your own services');
    }
  }

  /**
   * Likes are idempotent: PUT twice is one like. The counter moves in the same
   * transaction as the row, and only when a row was actually added or removed,
   * so concurrent likes can't drift from the likes table.
   */
  async setLike(userId: string, postId: string, isLiked: boolean): Promise<LikeState> {
    await this.requirePublicId(postId);
    return this.prisma.$transaction(async (tx) => {
      const { count } = isLiked
        ? await tx.like.createMany({ data: [{ userId, postId }], skipDuplicates: true })
        : await tx.like.deleteMany({ where: { userId, postId } });
      if (count > 0 && isLiked) await recordEvent(tx, 'post.liked', { userId, postId });
      const likeCount =
        count > 0
          ? await this.adjustCounter(tx, postId, 'likeCount', isLiked ? 1 : -1)
          : (await tx.post.findUniqueOrThrow({ where: { id: postId } })).likeCount;
      return { isLiked, likeCount };
    });
  }

  /** Adds `delta` to one of a post's counters and returns the new value. */
  async adjustCounter(
    tx: Prisma.TransactionClient,
    postId: string,
    counter: 'likeCount' | 'commentCount' | 'saveCount',
    delta: number,
  ): Promise<number> {
    const row = await tx.post.update({
      where: { id: postId },
      data: { [counter]: { increment: delta } },
      select: { likeCount: true, commentCount: true, saveCount: true },
    });
    return row[counter];
  }

  /** Public posts by id, in the order given; missing or hidden ones are left out. */
  async getPublicMany(ids: string[], viewerId: string | null): Promise<Post[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.post.findMany({
      where: { id: { in: ids }, ...PUBLIC_POST },
      include: postInclude,
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return this.toPosts(
      ids.flatMap((id) => byId.get(id) ?? []),
      viewerId,
    );
  }

  private async one(row: PostRow, viewerId: string | null): Promise<Post> {
    const [post] = await this.toPosts([row], viewerId);
    if (!post) throw notFound();
    return post;
  }

  private async publishedPage(
    rows: PostRow[],
    limit: number,
    viewerId: string | null,
  ): Promise<Page<Post>> {
    const pageRows = rows.slice(0, limit);
    const last = pageRows.at(-1);
    const nextCursor =
      rows.length > limit && last?.publishedAt ? encodeTimeCursor(last.publishedAt, last.id) : null;
    return { data: await this.toPosts(pageRows, viewerId), nextCursor };
  }

  /** Maps rows to the response shape, with the viewer's own like and save flags. */
  async toPosts(rows: PostRow[], viewerId: string | null): Promise<Post[]> {
    const ids = rows.map((row) => row.id);
    const [liked, saved] =
      viewerId && ids.length > 0
        ? await Promise.all([
            this.prisma.like
              .findMany({
                where: { userId: viewerId, postId: { in: ids } },
                select: { postId: true },
              })
              .then((likes) => new Set(likes.map((like) => like.postId))),
            this.saved.savedIds(viewerId, 'post', ids),
          ])
        : [new Set<string>(), new Set<string>()];
    const mediaUrl = this.businesses.mediaUrl;
    return rows.map((row) => ({
      id: row.id,
      business: toBusinessSummary(row.business, mediaUrl),
      type: row.type,
      body: row.body,
      offerTag: row.offerTag,
      offerEndsAt: row.offerEndsAt?.toISOString() ?? null,
      attachment: toAttachment(row, mediaUrl),
      media: row.media.flatMap(({ upload }) => {
        const media = toMedia(upload, mediaUrl);
        return media ? [{ ...media, kind: isVideo(upload) ? 'video' : 'image' } as const] : [];
      }),
      status: row.status,
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      saveCount: row.saveCount,
      isLiked: liked.has(row.id),
      isSaved: saved.has(row.id),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }
}

/** The listing card, while the listing is published and not deleted. */
function toAttachment(row: PostRow, mediaUrl: MediaUrl): PostAttachment | null {
  const listing = row.product ?? row.service;
  if (!listing || listing.status !== 'published' || listing.deletedAt !== null) return null;
  return {
    type: row.product ? 'product' : 'service',
    id: listing.id,
    title: listing.title,
    price: toMoney(listing.pricePaise),
    image: toMedia(listing.media[0]?.upload ?? null, mediaUrl),
  };
}
