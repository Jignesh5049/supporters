import {
  type MyRequirementsQuery,
  type Page,
  type PaginationQuery,
  RATE_LIMITS,
  REQUIREMENT,
  type Requirement,
  type RequirementStatus,
  type createRequirementSchema,
  type productUnitSchema,
} from '@supporters/shared';
import type { z } from 'zod';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  AppError,
  ErrorCode,
  invalidField,
  isUniqueViolation,
  notFound,
  rateLimited,
} from '../../lib/errors';
import { decodeCursor, encodeCursor, pageArgs, splitPage } from '../../lib/pagination';
import type { BusinessesService } from '../businesses/businesses.service';
import { toCategoryRef } from '../categories/categories.service';
import type { CategoriesService } from '../categories/categories.service';
import { toMoney } from '../listings/listings.service';
import { recordEvent } from '../notifications/outbox';
import { toCity, type PlacesService } from '../places/places.service';
import { toMedia, type UploadsService } from '../uploads/uploads.service';

const DAY_MS = 24 * 60 * 60 * 1000;

const requirementInclude = {
  category: true,
  deliveryCity: { include: { state: true } },
  images: { orderBy: { position: 'asc' }, include: { upload: true } },
  user: { select: { id: true, name: true, city: { include: { state: true } } } },
} satisfies Prisma.BuyerRequirementInclude;
type RequirementRow = Prisma.BuyerRequirementGetPayload<{ include: typeof requirementInclude }>;

type ProductUnit = z.infer<typeof productUnitSchema>;
type CreateRequirement = z.infer<typeof createRequirementSchema>;

const suspended = () => new AppError(403, ErrorCode.AccountSuspended, 'Your account is suspended');
const notOpen = () =>
  new AppError(409, ErrorCode.RequirementNotOpen, 'This requirement is no longer open');

/** An open requirement past its expiry is expired, whether or not the cron has run yet. */
const isLive = (now: Date) =>
  ({ status: 'open', expiresAt: { gt: now } }) satisfies Prisma.BuyerRequirementWhereInput;

const statusFilter = (status: RequirementStatus, now: Date): Prisma.BuyerRequirementWhereInput => {
  switch (status) {
    case 'open':
      return isLive(now);
    case 'expired':
      return { OR: [{ status: 'expired' }, { status: 'open', expiresAt: { lte: now } }] };
    default:
      return { status };
  }
};

/** Neither the viewer nor the buyer has blocked the other. */
const notBlockedWith = (userId: string): Prisma.UserWhereInput => ({
  blocksMade: { none: { blockedId: userId } },
  blocksReceived: { none: { blockerId: userId } },
});

/**
 * Buyer requirements (product spec, Discovery and buyer
 * requirements). Matching happens in the worker; see requirements.matching.ts.
 */
export class RequirementsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly businesses: BusinessesService,
    private readonly categories: CategoriesService,
    private readonly places: PlacesService,
    private readonly uploads: UploadsService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /**
   * Posts a requirement. 3 new ones per rolling 24 hours and 10 open at once
   * (backend spec, Limits), counted under a per-user lock so parallel posts
   * cannot slip past either limit.
   */
  async create(userId: string, input: CreateRequirement): Promise<Requirement> {
    await this.requireActive(userId);
    await this.categories.requireActive(input.categoryId, 'body.categoryId');
    await this.places.requireCity(input.deliveryCityId, 'body.deliveryCityId');
    await this.uploads.requireReady(userId, input.imageIds, 'requirement', 'body.imageIds');

    const now = this.now();
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`requirements:${userId}`}, 0))`;
        const open = await tx.buyerRequirement.count({ where: { userId, ...isLive(now) } });
        if (open >= RATE_LIMITS.openRequirements) {
          throw new AppError(
            409,
            ErrorCode.RequirementLimitReached,
            `You can have ${RATE_LIMITS.openRequirements} open requirements at once`,
            { detail: 'Close or fulfil one to post another.' },
          );
        }
        const recent = await tx.buyerRequirement.findMany({
          where: { userId, createdAt: { gt: new Date(now.getTime() - DAY_MS) } },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        });
        const oldest = recent[0];
        if (recent.length >= RATE_LIMITS.requirementsPerDay && oldest) {
          throw rateLimited(
            Math.ceil((oldest.createdAt.getTime() + DAY_MS - now.getTime()) / 1000),
          );
        }
        const created = await tx.buyerRequirement.create({
          data: {
            userId,
            categoryId: input.categoryId,
            description: input.description,
            quantity: input.quantity,
            unit: input.unit,
            deliveryCityId: input.deliveryCityId,
            budgetPaise: input.budget ? BigInt(input.budget.amountPaise) : null,
            expiresAt: new Date(now.getTime() + REQUIREMENT.openDays * DAY_MS),
            createdAt: now,
            images: {
              create: input.imageIds.map((uploadId, position) => ({ uploadId, position })),
            },
          },
          include: requirementInclude,
        });
        await recordEvent(tx, 'requirement.created', { requirementId: created.id });
        return created;
      });
      return this.toRequirement(row, { viewerId: userId, quotedIds: new Set() });
    } catch (error) {
      // An image already attached to another requirement.
      if (isUniqueViolation(error)) throw invalidField('body.imageIds', 'Image already used');
      throw error;
    }
  }

  /** What the user posted, newest first, optionally one status. */
  async listMine(userId: string, query: MyRequirementsQuery): Promise<Page<Requirement>> {
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.buyerRequirement.findMany({
      ...page,
      where: {
        ...page.where,
        userId,
        ...(query.status ? statusFilter(query.status, this.now()) : {}),
      },
      include: requirementInclude,
    });
    const split = splitPage(rows, query.limit);
    return {
      data: split.rows.map((row) =>
        this.toRequirement(row, { viewerId: userId, quotedIds: new Set() }),
      ),
      nextCursor: split.nextCursor,
    };
  }

  /**
   * The Requirements list of the user's business: open requirements it was
   * matched to, newest first. The pinned feed card is the first item.
   */
  async listMatched(userId: string, query: PaginationQuery): Promise<Page<Requirement>> {
    const business = await this.businesses.requireOwned(userId);
    const after = decodeCursor(query.cursor);
    const matches = await this.prisma.requirementMatch.findMany({
      where: {
        businessId: business.id,
        ...(after ? { requirementId: { lt: after } } : {}),
        requirement: {
          ...isLive(this.now()),
          user: { status: 'active', ...notBlockedWith(userId) },
        },
      },
      orderBy: { requirementId: 'desc' },
      take: query.limit + 1,
      include: { requirement: { include: requirementInclude } },
    });
    const rows = matches.slice(0, query.limit).map((match) => match.requirement);
    const last = rows.at(-1);
    const quotedIds = await this.quotedBy(
      business.id,
      rows.map((row) => row.id),
    );
    return {
      data: rows.map((row) => this.toRequirement(row, { viewerId: userId, quotedIds })),
      nextCursor: matches.length > query.limit && last ? encodeCursor(last.id) : null,
    };
  }

  /** The buyer, or a business it was matched to, can open it; everyone else gets 404. */
  async get(userId: string, id: string): Promise<Requirement> {
    const row = await this.prisma.buyerRequirement.findUnique({
      where: { id },
      include: requirementInclude,
    });
    if (!row) throw notFound();
    if (row.userId === userId) {
      return this.toRequirement(row, { viewerId: userId, quotedIds: new Set() });
    }
    const businessId = await this.matchedBusinessId(userId, id);
    if (!businessId) throw notFound();
    const quotedIds = await this.quotedBy(businessId, [id]);
    return this.toRequirement(row, { viewerId: userId, quotedIds });
  }

  /** The buyer closes it early or marks it fulfilled. Only an open requirement changes. */
  async update(userId: string, id: string, status: 'closed' | 'fulfilled'): Promise<Requirement> {
    const existing = await this.prisma.buyerRequirement.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!existing) throw notFound();
    const now = this.now();
    const { count } = await this.prisma.buyerRequirement.updateMany({
      where: { id, ...isLive(now) },
      data: { status, closedAt: now },
    });
    if (count === 0) throw notOpen();
    return this.get(userId, id);
  }

  private async requireActive(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    if (user?.status !== 'active') throw suspended();
  }

  /** The id of the user's business when that business was matched to the requirement. */
  private async matchedBusinessId(userId: string, requirementId: string) {
    const match = await this.prisma.requirementMatch.findFirst({
      where: {
        requirementId,
        business: { ownerUserId: userId },
        requirement: { user: { status: 'active', ...notBlockedWith(userId) } },
      },
      select: { businessId: true },
    });
    return match?.businessId ?? null;
  }

  private async quotedBy(businessId: string, requirementIds: string[]) {
    if (requirementIds.length === 0) return new Set<string>();
    const rows = await this.prisma.requirementQuote.findMany({
      where: { businessId, requirementId: { in: requirementIds } },
      select: { requirementId: true },
    });
    return new Set(rows.map((row) => row.requirementId));
  }

  private toRequirement(
    row: RequirementRow,
    viewer: { viewerId: string; quotedIds: Set<string> },
  ): Requirement {
    const mediaUrl = this.businesses.mediaUrl;
    const isExpired = row.status === 'open' && row.expiresAt <= this.now();
    return {
      id: row.id,
      status: isExpired ? 'expired' : row.status,
      description: row.description,
      category: toCategoryRef(row.category),
      quantity: row.quantity,
      unit: row.unit as ProductUnit,
      deliveryCity: toCity(row.deliveryCity),
      budget: toMoney(row.budgetPaise),
      images: row.images.flatMap((image) => toMedia(image.upload, mediaUrl) ?? []),
      buyer: {
        id: row.user.id,
        name: row.user.name,
        city: row.user.city ? toCity(row.user.city) : null,
      },
      quoteCount: row.quoteCount,
      hasQuoted: viewer.quotedIds.has(row.id),
      isMine: row.userId === viewer.viewerId,
      expiresAt: row.expiresAt.toISOString(),
      closedAt: (row.closedAt ?? (isExpired ? row.expiresAt : null))?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
