import {
  ENQUIRY_LIMITS,
  type BusinessEnquiriesQuery,
  type CreateEnquiryInput,
  type Enquiry,
  type Page,
  type PaginationQuery,
  RATE_LIMITS,
  type ResponseStats,
} from '@supporters/shared';
import type { Redis } from 'ioredis';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import {
  AppError,
  ErrorCode,
  invalidField,
  isUniqueViolation,
  notFound,
  rateLimited,
} from '../../lib/errors';
import { pageArgs, splitPage } from '../../lib/pagination';
import type { SlidingWindowLimiter } from '../../lib/sliding-window';
import type { BlocksService } from '../blocks/blocks.service';
import {
  type BusinessesService,
  PUBLIC_OWNER,
  summaryInclude,
  toBusinessSummary,
} from '../businesses/businesses.service';
import { listingCardInclude, messageInclude, toListingCard } from '../chat/chat.mapper';
import { type ChatService, blockedError, keyReusedError, requestHash } from '../chat/chat.service';
import { PUBLIC_LISTING } from '../listings/listings.service';
import { recordEvent } from '../notifications/outbox';
import { toCity } from '../places/places.service';

const DAY_SEC = 24 * 60 * 60;

const enquiryInclude = {
  user: { select: { id: true, name: true, phone: true } },
  business: { include: summaryInclude },
  deliveryCity: { include: { state: true } },
  ...listingCardInclude,
} satisfies Prisma.EnquiryInclude;
type EnquiryRow = Prisma.EnquiryGetPayload<{ include: typeof enquiryInclude }>;

/** Enquiries (Contact Supplier): a structured first message that opens or joins the thread. */
export class EnquiriesService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly businesses: BusinessesService,
    private readonly chat: ChatService,
    private readonly blocks: BlocksService,
    private readonly limiter: SlidingWindowLimiter,
    private readonly valkey: Redis,
  ) {}

  /**
   * Posts the enquiry into the thread between this user and the listing's
   * business, starting the thread if there is none. The Idempotency-Key is the
   * message's clientId: a retry returns the stored enquiry and costs no quota.
   */
  async create(
    userId: string,
    clientId: string,
    input: CreateEnquiryInput,
  ): Promise<{ enquiry: Enquiry; replayed: boolean }> {
    // Retries that race the original wait for it, then replay its result.
    const lockKey = `idem:enquiry:${userId}:${clientId}`;
    for (let attempt = 0; ; attempt += 1) {
      const acquired = await this.valkey.set(lockKey, '1', 'EX', 30, 'NX');
      if (acquired === 'OK') break;
      const replay = await this.replayOf(userId, clientId, requestHash(['enquiry', input]));
      if (replay) return { enquiry: replay, replayed: true };
      if (attempt >= 25) {
        throw new AppError(409, ErrorCode.RequestInProgress, 'Request already in progress', {
          retryAfter: 1,
        });
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    try {
      return await this.createLocked(userId, clientId, input);
    } finally {
      await this.valkey.del(lockKey);
    }
  }

  private async createLocked(
    userId: string,
    clientId: string,
    input: CreateEnquiryInput,
  ): Promise<{ enquiry: Enquiry; replayed: boolean }> {
    const hash = requestHash(['enquiry', input]);
    const replay = await this.replayOf(userId, clientId, hash);
    if (replay) return { enquiry: replay, replayed: true };

    const listing = await this.requireListing(input);
    const { businessId, ownerUserId } = listing;
    if (ownerUserId === userId) {
      throw invalidField('body.productId', 'You cannot send an enquiry to your own business');
    }
    if (await this.blocks.isBlockedEitherWay(userId, ownerUserId)) {
      throw blockedError();
    }
    if (input.deliveryCityId) {
      const city = await this.prisma.city.findUnique({
        where: { id: input.deliveryCityId },
        select: { id: true },
      });
      if (!city) throw invalidField('body.deliveryCityId', 'Unknown city');
    }
    await this.hitLimits(userId, listing.id);

    const { conversation } = await this.chat.ensureConversation(userId, businessId);
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const message = await this.chat.append(tx, {
          conversation,
          senderUserId: userId,
          senderSide: 'user',
          clientId,
          requestHash: hash,
          type: 'enquiry',
          body: input.message,
          productId: input.productId,
          serviceId: input.serviceId,
        });
        const enquiry = await tx.enquiry.create({
          data: {
            userId,
            businessId,
            conversationId: conversation.id,
            messageId: message.id,
            productId: input.productId ?? null,
            serviceId: input.serviceId ?? null,
            quantity: input.quantity ?? null,
            unit: input.unit ?? null,
            deliveryCityId: input.deliveryCityId ?? null,
            message: input.message,
            sharePhone: input.sharePhone,
          },
          include: enquiryInclude,
        });
        await recordEvent(tx, 'enquiry.created', { enquiryId: enquiry.id });
        return { enquiry, messageId: message.id };
      });
      const stored = await this.prisma.message.findUniqueOrThrow({
        where: { id: row.messageId },
        include: messageInclude,
      });
      this.chat.events.messageNew(conversation, this.chat.message(stored));
      return { enquiry: this.toEnquiry(row.enquiry, 'user'), replayed: false };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const raced = await this.replayOf(userId, clientId, hash);
      if (!raced) throw error;
      return { enquiry: raced, replayed: true };
    }
  }

  /** What the user has sent, newest first. */
  async listMine(userId: string, query: PaginationQuery): Promise<Page<Enquiry>> {
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.enquiry.findMany({
      ...page,
      where: { ...page.where, userId },
      include: enquiryInclude,
    });
    const split = splitPage(rows, query.limit);
    return {
      data: split.rows.map((row) => this.toEnquiry(row, 'user')),
      nextCursor: split.nextCursor,
    };
  }

  /** The inbox of the business owner, filtered by status, date range and listing. */
  async listForBusiness(userId: string, query: BusinessEnquiriesQuery): Promise<Page<Enquiry>> {
    const business = await this.businesses.requireOwned(userId);
    const page = pageArgs(query.cursor, query.limit);
    const rows = await this.prisma.enquiry.findMany({
      ...page,
      where: {
        ...page.where,
        businessId: business.id,
        ...(query.status ? { status: query.status } : {}),
        ...(query.productId ? { productId: query.productId } : {}),
        ...(query.serviceId ? { serviceId: query.serviceId } : {}),
        ...(query.from || query.to
          ? {
              createdAt: {
                ...(query.from ? { gte: new Date(query.from) } : {}),
                ...(query.to ? { lte: new Date(query.to) } : {}),
              },
            }
          : {}),
      },
      include: enquiryInclude,
    });
    const split = splitPage(rows, query.limit);
    return {
      data: split.rows.map((row) => this.toEnquiry(row, 'business')),
      nextCursor: split.nextCursor,
    };
  }

  /** The owner closes an enquiry by hand. Closing twice is fine. */
  async close(userId: string, id: string): Promise<Enquiry> {
    const business = await this.businesses.requireOwned(userId);
    const existing = await this.prisma.enquiry.findFirst({
      where: { id, businessId: business.id },
      select: { id: true },
    });
    if (!existing) throw notFound();
    await this.prisma.enquiry.updateMany({
      where: { id, status: { not: 'closed' } },
      data: { status: 'closed', closedAt: new Date() },
    });
    const row = await this.prisma.enquiry.findUniqueOrThrow({
      where: { id },
      include: enquiryInclude,
    });
    return this.toEnquiry(row, 'business');
  }

  /**
   * Response rate and time over the last 90 days (product spec, Messaging).
   * Rate: enquiries first answered within 24 hours, out of all of them. Time:
   * the median minutes to the first reply, among those answered. Both are null
   * below 5 enquiries.
   */
  async responseStats(businessId: string): Promise<ResponseStats> {
    await this.businesses.requirePublicId(businessId);
    const [row] = await this.prisma.$queryRaw<
      { total: number; inTime: number; median: number | null }[]
    >`
      SELECT count(*)::int AS "total",
        (count(*) FILTER (
          WHERE first_response_at IS NOT NULL
            AND first_response_at - created_at <= make_interval(hours => ${ENQUIRY_LIMITS.respondedWithinHours})
        ))::int AS "inTime",
        (percentile_cont(0.5) WITHIN GROUP (
          ORDER BY extract(epoch FROM first_response_at - created_at) / 60
        ) FILTER (WHERE first_response_at IS NOT NULL))::float8 AS "median"
      FROM enquiries
      WHERE business_id = ${businessId}::uuid
        AND created_at >= now() - make_interval(days => ${ENQUIRY_LIMITS.statsWindowDays})`;
    const total = row?.total ?? 0;
    if (!row || total < ENQUIRY_LIMITS.statsMinEnquiries) {
      return { enquiryCount: total, responseRate: null, medianResponseMinutes: null };
    }
    return {
      enquiryCount: total,
      responseRate: row.inTime / total,
      medianResponseMinutes: row.median === null ? null : Math.round(row.median * 10) / 10,
    };
  }

  /** A retried send: the stored enquiry, or null when the key is new. */
  private async replayOf(userId: string, clientId: string, hash: string) {
    const message = await this.prisma.message.findUnique({
      where: { senderUserId_clientId: { senderUserId: userId, clientId } },
      select: { requestHash: true, enquiry: { include: enquiryInclude } },
    });
    if (!message) return null;
    if (message.requestHash !== hash || !message.enquiry) throw keyReusedError();
    return this.toEnquiry(message.enquiry, 'user');
  }

  /** The listing must be public. Its business and owner come from it, never from the client. */
  private async requireListing(input: CreateEnquiryInput) {
    const select = { id: true, businessId: true, business: { select: { ownerUserId: true } } };
    const where = (id: string) => ({ id, ...PUBLIC_LISTING, business: PUBLIC_OWNER });
    const found = input.productId
      ? await this.prisma.product.findFirst({ where: where(input.productId), select })
      : input.serviceId
        ? await this.prisma.service.findFirst({ where: where(input.serviceId), select })
        : null;
    if (!found) throw notFound();
    return {
      id: found.id,
      businessId: found.businessId,
      ownerUserId: found.business.ownerUserId,
    };
  }

  /** 20 a day per user, and one per listing per 24 hours (backend spec, Limits). */
  private async hitLimits(userId: string, listingId: string) {
    const perListing = [
      `enquiry-listing:${userId}:${listingId}`,
      1,
      ENQUIRY_LIMITS.perListingWindowSec,
    ] as const;
    const perDay = [`enquiries:${userId}`, RATE_LIMITS.enquiriesPerDay, DAY_SEC] as const;
    for (const [key, max, windowSec] of [perListing, perDay]) {
      const peek = await this.limiter.peek(key, max, windowSec);
      if (!peek.allowed) throw rateLimited(peek.resetMs / 1000);
    }
    for (const [key, max, windowSec] of [perListing, perDay]) {
      const hit = await this.limiter.hit(key, max, windowSec);
      if (!hit.allowed) throw rateLimited(hit.resetMs / 1000);
    }
  }

  private toEnquiry(row: EnquiryRow, viewer: 'user' | 'business'): Enquiry {
    const mediaUrl = this.businesses.mediaUrl;
    return {
      id: row.id,
      status: row.status,
      conversationId: row.conversationId,
      messageId: row.messageId,
      buyer: { id: row.user.id, name: row.user.name },
      business: toBusinessSummary(row.business, mediaUrl),
      listing: toListingCard(row, mediaUrl),
      quantity: row.quantity,
      unit: row.unit,
      deliveryCity: row.deliveryCity ? toCity(row.deliveryCity) : null,
      message: row.message,
      sharePhone: row.sharePhone,
      buyerPhone: viewer === 'business' && row.sharePhone ? row.user.phone : null,
      firstResponseAt: row.firstResponseAt?.toISOString() ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
