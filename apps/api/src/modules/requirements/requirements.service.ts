import {
  type MyRequirementsQuery,
  type Page,
  type PaginationQuery,
  type Quote,
  RATE_LIMITS,
  REQUIREMENT,
  type Requirement,
  type RequirementStatus,
  type createQuoteSchema,
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
import type { BlocksService } from '../blocks/blocks.service';
import {
  type BusinessesService,
  PUBLIC_OWNER,
  businessRequired,
  summaryInclude,
  toBusinessSummary,
} from '../businesses/businesses.service';
import { toCategoryRef } from '../categories/categories.service';
import type { CategoriesService } from '../categories/categories.service';
import { messageInclude } from '../chat/chat.mapper';
import { type ChatService, blockedError, keyReusedError, requestHash } from '../chat/chat.service';
import { PUBLIC_LISTING, toMoney } from '../listings/listings.service';
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

const quoteInclude = {
  business: { include: summaryInclude },
} satisfies Prisma.RequirementQuoteInclude;
type QuoteRow = Prisma.RequirementQuoteGetPayload<{ include: typeof quoteInclude }>;

type ProductUnit = z.infer<typeof productUnitSchema>;
type CreateRequirement = z.infer<typeof createRequirementSchema>;
type CreateQuote = z.infer<typeof createQuoteSchema>;

const suspended = () => new AppError(403, ErrorCode.AccountSuspended, 'Your account is suspended');
const notOpen = () =>
  new AppError(409, ErrorCode.RequirementNotOpen, 'This requirement is no longer open');
const notVerified = () =>
  new AppError(403, ErrorCode.BusinessNotVerified, 'Only verified businesses can quote', {
    detail: 'Get your business verified from the Business Hub first.',
  });
const quoteExists = () =>
  new AppError(409, ErrorCode.QuoteExists, 'Your business has already quoted on this requirement');

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
 * Buyer requirements and quotes (product spec, Discovery and buyer
 * requirements). Matching happens in the worker; see requirements.matching.ts.
 */
export class RequirementsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly businesses: BusinessesService,
    private readonly categories: CategoriesService,
    private readonly places: PlacesService,
    private readonly uploads: UploadsService,
    private readonly chat: ChatService,
    private readonly blocks: BlocksService,
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

  /** Quotes on the buyer's own requirement, newest first. */
  async listQuotes(userId: string, id: string, query: PaginationQuery): Promise<Page<Quote>> {
    const owned = await this.prisma.buyerRequirement.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!owned) throw notFound();
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.requirementQuote.findMany({
      ...page,
      where: { ...page.where, requirementId: id, business: PUBLIC_OWNER },
      include: quoteInclude,
    });
    const split = splitPage(rows, query.limit);
    return { data: split.rows.map((row) => this.toQuote(row)), nextCursor: split.nextCursor };
  }

  /**
   * A verified, matched business quotes once. The quote is posted as a
   * `quote` message into the DM thread between the buyer and the business,
   * opening the thread if there is none, and the buyer is notified. The
   * Idempotency-Key is the message's clientId: a retry returns the stored
   * quote.
   */
  async quote(
    userId: string,
    requirementId: string,
    clientId: string,
    input: CreateQuote,
  ): Promise<{ quote: Quote; replayed: boolean }> {
    const hash = requestHash(['quote', requirementId, input]);
    const replay = await this.replayOf(userId, clientId, hash);
    if (replay) return { quote: replay, replayed: true };

    await this.requireActive(userId);
    const business = await this.prisma.business.findUnique({
      where: { ownerUserId: userId },
      select: { id: true, verificationStatus: true },
    });
    if (!business) throw businessRequired();

    const requirement = await this.prisma.buyerRequirement.findFirst({
      where: {
        id: requirementId,
        user: { status: 'active' },
        matches: { some: { businessId: business.id } },
      },
      select: { id: true, userId: true, status: true, expiresAt: true },
    });
    if (!requirement) throw notFound();
    if (business.verificationStatus !== 'verified') throw notVerified();
    const now = this.now();
    if (requirement.status !== 'open' || requirement.expiresAt <= now) throw notOpen();
    if (await this.blocks.isBlockedEitherWay(userId, requirement.userId)) throw blockedError();
    const listing = await this.requireOwnListing(business.id, input.listing);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`quotes:${business.id}`}, 0))`;
        const existing = await tx.requirementQuote.findUnique({
          where: { requirementId_businessId: { requirementId, businessId: business.id } },
          select: { id: true },
        });
        if (existing) throw quoteExists();
        const today = await tx.requirementQuote.findMany({
          where: { businessId: business.id, createdAt: { gt: new Date(now.getTime() - DAY_MS) } },
          orderBy: { createdAt: 'asc' },
          select: { createdAt: true },
        });
        const oldest = today[0];
        if (today.length >= RATE_LIMITS.quotesPerBusinessPerDay && oldest) {
          throw rateLimited(
            Math.ceil((oldest.createdAt.getTime() + DAY_MS - now.getTime()) / 1000),
          );
        }
        // The business starts the thread here, so it doesn't count against the
        // buyer's daily cap on new conversations.
        const conversation = await tx.conversation.upsert({
          where: { userId_businessId: { userId: requirement.userId, businessId: business.id } },
          create: { userId: requirement.userId, businessId: business.id },
          update: {},
          select: { id: true, userId: true, businessId: true },
        });
        const message = await this.chat.append(tx, {
          conversation,
          senderUserId: userId,
          senderSide: 'business',
          clientId,
          requestHash: hash,
          type: 'quote',
          body: input.message,
          productId: listing?.productId,
          serviceId: listing?.serviceId,
        });
        const quote = await tx.requirementQuote.create({
          data: {
            requirementId,
            businessId: business.id,
            pricePaise: BigInt(input.price.amountPaise),
            message: input.message,
            productId: listing?.productId ?? null,
            serviceId: listing?.serviceId ?? null,
            conversationId: conversation.id,
            messageId: message.id,
            createdAt: now,
          },
          include: quoteInclude,
        });
        await tx.buyerRequirement.update({
          where: { id: requirementId },
          data: { quoteCount: { increment: 1 } },
        });
        await recordEvent(tx, 'requirement.quoted', { quoteId: quote.id });
        return { quote, conversation, messageId: message.id };
      });
      const stored = await this.prisma.message.findUniqueOrThrow({
        where: { id: result.messageId },
        include: messageInclude,
      });
      this.chat.events.messageNew(result.conversation, this.chat.message(stored));
      return { quote: this.toQuote(result.quote), replayed: false };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // A parallel retry with the same key won the race, or another request quoted first.
      const raced = await this.replayOf(userId, clientId, hash);
      if (raced) return { quote: raced, replayed: true };
      throw quoteExists();
    }
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

  /** The attached listing must be a published product or service of the quoting business. */
  private async requireOwnListing(
    businessId: string,
    listing: { type: 'product' | 'service'; id: string } | undefined,
  ) {
    if (!listing) return null;
    const where = { id: listing.id, businessId, ...PUBLIC_LISTING };
    const found =
      listing.type === 'product'
        ? await this.prisma.product.findFirst({ where, select: { id: true } })
        : await this.prisma.service.findFirst({ where, select: { id: true } });
    if (!found) throw invalidField('body.listing', 'Pick a published listing of your business');
    return listing.type === 'product' ? { productId: found.id } : { serviceId: found.id };
  }

  /** A retried quote: the stored one, or null when the key is new. */
  private async replayOf(userId: string, clientId: string, hash: string) {
    const message = await this.prisma.message.findUnique({
      where: { senderUserId_clientId: { senderUserId: userId, clientId } },
      select: { requestHash: true, quote: { include: quoteInclude } },
    });
    if (!message) return null;
    if (message.requestHash !== hash || !message.quote) throw keyReusedError();
    return this.toQuote(message.quote);
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

  private toQuote(row: QuoteRow): Quote {
    return {
      id: row.id,
      requirementId: row.requirementId,
      business: toBusinessSummary(row.business, this.businesses.mediaUrl),
      price: { amountPaise: Number(row.pricePaise), currency: 'INR' },
      message: row.message,
      conversationId: row.conversationId,
      messageId: row.messageId,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
