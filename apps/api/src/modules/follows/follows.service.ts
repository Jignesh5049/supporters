import type {
  FollowState,
  FollowerItem,
  FollowingItem,
  Page,
  PaginationQuery,
} from '@supporters/shared';
import type { PrismaClient } from '../../generated/prisma/client';
import { invalidField } from '../../lib/errors';
import { pageArgs, splitPage } from '../../lib/pagination';
import { recordEvent } from '../notifications/outbox';
import {
  type BusinessesService,
  PUBLIC_OWNER,
  summaryInclude,
  toBusinessSummary,
} from '../businesses/businesses.service';

/** Users follow businesses only (product spec, Decisions 2). */
export class FollowsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly businesses: BusinessesService,
  ) {}

  /**
   * Idempotent follow or unfollow. The follower count moves in the same
   * transaction as the row, and only when a row was actually added or removed.
   */
  async setFollowing(
    userId: string,
    businessId: string,
    isFollowing: boolean,
  ): Promise<FollowState> {
    await this.businesses.requirePublicId(businessId);
    if (isFollowing) {
      const own = await this.prisma.business.findFirst({
        where: { id: businessId, ownerUserId: userId },
        select: { id: true },
      });
      if (own) throw invalidField('params.businessId', 'You cannot follow your own business');
    }
    return this.prisma.$transaction(async (tx) => {
      const { count } = isFollowing
        ? await tx.follow.createMany({ data: [{ userId, businessId }], skipDuplicates: true })
        : await tx.follow.deleteMany({ where: { userId, businessId } });
      if (count > 0 && isFollowing) {
        await recordEvent(tx, 'follow.created', { userId, businessId });
      }
      const followerCount =
        count > 0
          ? await this.businesses.adjustFollowerCount(tx, businessId, isFollowing ? 1 : -1)
          : (await tx.business.findUniqueOrThrow({ where: { id: businessId } })).followerCount;
      return { isFollowing, followerCount };
    });
  }

  /** What the user follows, newest follow first. Businesses no longer public are hidden. */
  async listFollowing(userId: string, query: PaginationQuery): Promise<Page<FollowingItem>> {
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.follow.findMany({
      ...page,
      where: { ...page.where, userId, business: PUBLIC_OWNER },
      include: { business: { include: summaryInclude } },
    });
    const split = splitPage(rows, query.limit);
    return {
      data: split.rows.map((row) => ({
        business: toBusinessSummary(row.business, this.businesses.mediaUrl),
        followedAt: row.createdAt.toISOString(),
      })),
      nextCursor: split.nextCursor,
    };
  }

  /** A business's followers, newest first: names only, never contact details. */
  async listFollowers(businessId: string, query: PaginationQuery): Promise<Page<FollowerItem>> {
    await this.businesses.requirePublicId(businessId);
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.follow.findMany({
      ...page,
      where: { ...page.where, businessId, user: { status: 'active' } },
      include: { user: { select: { id: true, name: true } } },
    });
    const split = splitPage(rows, query.limit);
    return {
      data: split.rows.map((row) => ({ user: row.user, followedAt: row.createdAt.toISOString() })),
      nextCursor: split.nextCursor,
    };
  }
}
