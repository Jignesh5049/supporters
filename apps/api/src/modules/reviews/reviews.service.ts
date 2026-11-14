import {
  type CreateReviewInput,
  type MyReview,
  type PaginationQuery,
  REVIEW_LIMITS,
  type Review,
  type ReviewEligibility,
  type ReviewsPage,
  type UpdateReviewInput,
} from '@supporters/shared';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { AppError, ErrorCode, isUniqueViolation, notFound } from '../../lib/errors';
import { pageArgs, splitPage } from '../../lib/pagination';
import type { BlocksService } from '../blocks/blocks.service';
import { type BusinessesService, PUBLIC_OWNER, toRating } from '../businesses/businesses.service';
import { recordEvent } from '../notifications/outbox';

const HOUR_MS = 60 * 60 * 1000;

const reviewInclude = { user: { select: { id: true, name: true } } } satisfies Prisma.ReviewInclude;
type ReviewRow = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

const suspended = () => new AppError(403, ErrorCode.AccountSuspended, 'Your account is suspended');

const NOT_ELIGIBLE: Record<Exclude<ReviewEligibility, 'eligible'>, () => AppError> = {
  reviewed: () =>
    new AppError(409, ErrorCode.ReviewExists, 'You have already reviewed this business', {
      detail: 'Edit your review instead.',
    }),
  own_business: () => new AppError(403, ErrorCode.Forbidden, 'You cannot review your own business'),
  no_thread: () =>
    new AppError(403, ErrorCode.ReviewNotEligible, 'Chat with this business before reviewing it', {
      detail: 'Reviews need a chat or enquiry with the business, at least 24 hours old.',
    }),
  too_soon: () =>
    new AppError(403, ErrorCode.ReviewNotEligible, 'You can review this business soon', {
      detail: 'Reviews open 24 hours after your first chat or enquiry with the business.',
    }),
  blocked: () =>
    new AppError(403, ErrorCode.Blocked, 'You cannot review this business', {
      detail: 'One of you has blocked the other.',
    }),
};

/**
 * Recomputes `businesses.rating_avg` and `rating_count` from the visible
 * reviews (backend spec, Data model: Reviews). Call it in the transaction of
 * every review change, after `lockBusiness`; moderation (hiding a review)
 * must call it too.
 */
export async function recomputeRating(tx: Prisma.TransactionClient, businessId: string) {
  await tx.$executeRaw`
    UPDATE businesses b SET
      rating_count = s.count,
      rating_avg = s.avg
    FROM (
      SELECT count(*)::int AS count, round(avg(rating), 1) AS avg
      FROM reviews WHERE business_id = ${businessId}::uuid AND hidden_at IS NULL
    ) s
    WHERE b.id = ${businessId}::uuid`;
}

/**
 * Takes the business row lock, so concurrent review changes recompute one
 * after another and each sees the others' committed rows.
 */
async function lockBusiness(tx: Prisma.TransactionClient, businessId: string) {
  await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${businessId}::uuid FOR UPDATE`;
}

/** Reviews on businesses (product spec, Reviews and ratings). */
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly businesses: BusinessesService,
    private readonly blocks: BlocksService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** A public business's visible reviews, newest first, with its rating. */
  async list(
    viewerId: string | null,
    businessId: string,
    query: PaginationQuery,
  ): Promise<ReviewsPage> {
    await this.businesses.requirePublicId(businessId);
    const page = pageArgs(query.cursor, query.limit);
    const [rows, business] = await Promise.all([
      this.prisma.review.findMany({
        ...page,
        where: { ...page.where, businessId, hiddenAt: null, user: { status: 'active' } },
        include: reviewInclude,
      }),
      this.prisma.business.findUniqueOrThrow({
        where: { id: businessId },
        select: { ratingAvg: true, ratingCount: true },
      }),
    ]);
    const split = splitPage(rows, query.limit);
    return {
      data: split.rows.map((row) => this.toReview(row, viewerId)),
      nextCursor: split.nextCursor,
      rating: toRating(business),
    };
  }

  /** The viewer's review of the business, and whether they may write one. */
  async mine(userId: string, businessId: string): Promise<MyReview> {
    await this.businesses.requirePublicId(businessId);
    const review = await this.prisma.review.findUnique({
      where: { userId_businessId: { userId, businessId } },
      include: reviewInclude,
    });
    if (review) {
      return { review: this.toReview(review, userId), eligibility: 'reviewed', eligibleAt: null };
    }
    const { eligibility, eligibleAt } = await this.eligibility(userId, businessId);
    return { review: null, eligibility, eligibleAt: eligibleAt?.toISOString() ?? null };
  }

  /**
   * Who can review (product spec): a user with a chat or enquiry thread with
   * the business, opened at least 24 hours ago and holding at least one
   * message. One review per user per business; never the owner.
   */
  async create(userId: string, businessId: string, input: CreateReviewInput): Promise<Review> {
    await this.businesses.requirePublicId(businessId);
    await this.requireActive(userId);
    const { eligibility } = await this.eligibility(userId, businessId);
    if (eligibility !== 'eligible') throw NOT_ELIGIBLE[eligibility]();
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        await lockBusiness(tx, businessId);
        const created = await tx.review.create({
          data: { userId, businessId, rating: input.rating, body: input.body },
          include: reviewInclude,
        });
        await recomputeRating(tx, businessId);
        await recordEvent(tx, 'review.created', { reviewId: created.id });
        return created;
      });
      return this.toReview(row, userId);
    } catch (error) {
      if (isUniqueViolation(error)) throw NOT_ELIGIBLE.reviewed();
      throw error;
    }
  }

  /** The author edits their review at any time. Anyone else gets 404. */
  async update(userId: string, id: string, input: UpdateReviewInput): Promise<Review> {
    const existing = await this.requireAuthored(userId, id);
    const row = await this.prisma.$transaction(async (tx) => {
      await lockBusiness(tx, existing.businessId);
      const updated = await tx.review.update({
        where: { id },
        data: {
          ...(input.rating !== undefined ? { rating: input.rating } : {}),
          ...(input.body !== undefined ? { body: input.body } : {}),
        },
        include: reviewInclude,
      });
      await recomputeRating(tx, existing.businessId);
      return updated;
    });
    return this.toReview(row, userId);
  }

  /** The author deletes their review; the average drops it at once. */
  async remove(userId: string, id: string): Promise<void> {
    const existing = await this.requireAuthored(userId, id);
    await this.prisma.$transaction(async (tx) => {
      await lockBusiness(tx, existing.businessId);
      await tx.review.delete({ where: { id } });
      await recomputeRating(tx, existing.businessId);
    });
  }

  /** The owner's one public reply, written or edited. Hidden reviews look missing. */
  async reply(userId: string, id: string, body: string): Promise<Review> {
    const { updatedAt } = await this.requireOwnersReview(userId, id);
    const row = await this.prisma.review.update({
      where: { id },
      // updated_at tells readers the author edited it, so the reply leaves it alone.
      data: { ownerReply: body, ownerRepliedAt: this.now(), updatedAt },
      include: reviewInclude,
    });
    return this.toReview(row, userId);
  }

  async removeReply(userId: string, id: string): Promise<void> {
    const { updatedAt } = await this.requireOwnersReview(userId, id);
    await this.prisma.review.update({
      where: { id },
      data: { ownerReply: null, ownerRepliedAt: null, updatedAt },
    });
  }

  private async eligibility(
    userId: string,
    businessId: string,
  ): Promise<{ eligibility: Exclude<ReviewEligibility, 'reviewed'>; eligibleAt: Date | null }> {
    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: businessId },
      select: { ownerUserId: true },
    });
    if (business.ownerUserId === userId) return { eligibility: 'own_business', eligibleAt: null };
    if (await this.blocks.isBlockedEitherWay(userId, business.ownerUserId)) {
      return { eligibility: 'blocked', eligibleAt: null };
    }
    const thread = await this.prisma.conversation.findFirst({
      where: { userId, businessId, messages: { some: {} } },
      select: { createdAt: true },
    });
    if (!thread) return { eligibility: 'no_thread', eligibleAt: null };
    const eligibleAt = new Date(
      thread.createdAt.getTime() + REVIEW_LIMITS.eligibleAfterHours * HOUR_MS,
    );
    if (eligibleAt > this.now()) return { eligibility: 'too_soon', eligibleAt };
    return { eligibility: 'eligible', eligibleAt: null };
  }

  private async requireActive(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (user?.status !== 'active') throw suspended();
  }

  private async requireAuthored(userId: string, id: string) {
    const review = await this.prisma.review.findFirst({
      where: { id, userId },
      select: { businessId: true },
    });
    if (!review) throw notFound();
    return review;
  }

  private async requireOwnersReview(userId: string, id: string) {
    const review = await this.prisma.review.findFirst({
      where: { id, hiddenAt: null, business: { ownerUserId: userId, ...PUBLIC_OWNER } },
      select: { updatedAt: true },
    });
    if (!review) throw notFound();
    return review;
  }

  private toReview(row: ReviewRow, viewerId: string | null): Review {
    return {
      id: row.id,
      businessId: row.businessId,
      rating: row.rating,
      body: row.body,
      author: { id: row.user.id, name: row.user.name },
      ownerReply:
        row.ownerReply !== null && row.ownerRepliedAt !== null
          ? { body: row.ownerReply, repliedAt: row.ownerRepliedAt.toISOString() }
          : null,
      isMine: row.userId === viewerId,
      isHidden: row.hiddenAt !== null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
