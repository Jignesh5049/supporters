import type { Money } from '@supporters/shared';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { AppError, ErrorCode, invalidField } from '../../lib/errors';
import { type BusinessesService, publishedListingsLimit } from '../businesses/businesses.service';
import { toBusinessSummary } from '../businesses/businesses.service';
import { toCategoryRef } from '../categories/categories.service';

/** What products and services share: owner business, category and listing timestamps. */
export const listingInclude = {
  business: { include: { city: { include: { state: true } } } },
  category: true,
} satisfies Prisma.ProductInclude & Prisma.ServiceInclude;

type ListingRow = Prisma.ProductGetPayload<{ include: typeof listingInclude }>;

/** Public reads: published, not deleted, and the owner's account is active. */
export const PUBLIC_LISTING = {
  status: 'published',
  deletedAt: null,
  business: { owner: { status: 'active' } },
} satisfies Prisma.ProductWhereInput & Prisma.ServiceWhereInput;

export const toMoney = (paise: bigint | null): Money | null =>
  paise === null ? null : { amountPaise: Number(paise), currency: 'INR' };

export const toPaise = (money: { amountPaise: number } | null | undefined) =>
  money ? BigInt(money.amountPaise) : null;

export const listingBase = (row: Pick<ListingRow, 'business' | 'category'> & ListingFields) => ({
  id: row.id,
  business: toBusinessSummary(row.business),
  title: row.title,
  category: toCategoryRef(row.category),
  description: row.description,
  price: toMoney(row.pricePaise),
  status: row.status,
  publishedAt: row.publishedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

interface ListingFields {
  id: string;
  title: string;
  description: string;
  pricePaise: bigint | null;
  status: ListingRow['status'];
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const listingLimitReached = (limit: number) =>
  new AppError(409, ErrorCode.ListingLimitReached, 'Published listing limit reached', {
    detail: `The free plan allows ${limit} published products and services. Unpublish one or upgrade to Premium.`,
  });

export const assertPriceOrder = (price: bigint | null, originalPrice: bigint | null) => {
  if (price !== null && originalPrice !== null && originalPrice <= price) {
    throw invalidField('body.originalPrice', 'The original price must be above the price');
  }
};

/**
 * Runs a listing write. When it publishes a listing, the business row is
 * locked first (`FOR UPDATE`), so concurrent publishes from two tabs can't
 * both slip under the free plan limit.
 */
export class ListingWriter {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly businesses: BusinessesService,
  ) {}

  async write<T>(
    business: { id: string; premiumUntil: Date | null },
    publishing: boolean,
    write: (db: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    if (!publishing) return write(this.prisma);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM businesses WHERE id = ${business.id}::uuid FOR UPDATE`;
      const limit = publishedListingsLimit(business);
      if (
        limit !== null &&
        (await this.businesses.countPublishedListings(business.id, tx)) >= limit
      ) {
        throw listingLimitReached(limit);
      }
      return write(tx);
    });
  }
}
