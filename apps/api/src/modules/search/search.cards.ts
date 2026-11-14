import type { BusinessCard, ListingResult, PostCard } from '@supporters/shared';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { summaryInclude, toBusinessSummary, toRating } from '../businesses/businesses.service';
import { toCategoryRef } from '../categories/categories.service';
import { toMoney } from '../listings/listings.service';
import type { MediaUrl } from '../uploads/uploads.service';
import { toMedia } from '../uploads/uploads.service';
import { INDEXABLE } from './search.documents';

const EXCERPT_MAX = 200;

/** The start of a post, cut at a word boundary. */
export function excerpt(body: string, max = EXCERPT_MAX): string {
  const text = body.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export const businessCardInclude = {
  ...summaryInclude,
  category: true,
} satisfies Prisma.BusinessInclude;
type BusinessCardRow = Prisma.BusinessGetPayload<{ include: typeof businessCardInclude }>;

const firstImage = {
  orderBy: { position: 'asc' },
  take: 1,
  include: { upload: true },
} as const;

const listingCardInclude = {
  business: { include: summaryInclude },
  category: true,
  media: firstImage,
} as const;

/** Keeps `ids` order and drops ids without a row. */
const inOrder = <T extends { id: string }>(ids: string[], rows: T[]) => {
  const byId = new Map(rows.map((row) => [row.id, row]));
  return ids.flatMap((id) => byId.get(id) ?? []);
};

/**
 * Loads result cards from PostgreSQL with the public-page rules, so a stale
 * index entry (unpublished, deleted, owner suspended) is never shown.
 */
export class SearchCards {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly mediaUrl: MediaUrl,
  ) {}

  toBusinessCard(row: BusinessCardRow): BusinessCard {
    return {
      ...toBusinessSummary(row, this.mediaUrl),
      type: row.type,
      category: toCategoryRef(row.category),
      state: {
        id: row.city.state.id,
        code: row.city.state.code,
        name: row.city.state.name,
      },
      about: row.about,
      followerCount: row.followerCount,
      // Null below 3 visible reviews: the business shows "New".
      rating: toRating(row).average,
      reviewCount: row.ratingCount,
    };
  }

  async businesses(ids: string[]): Promise<BusinessCard[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.business.findMany({
      where: { AND: [{ id: { in: ids } }, INDEXABLE.business] },
      include: businessCardInclude,
    });
    return inOrder(ids, rows).map((row) => this.toBusinessCard(row));
  }

  async products(ids: string[]): Promise<ListingResult[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.product.findMany({
      where: { AND: [{ id: { in: ids } }, INDEXABLE.listing] },
      include: listingCardInclude,
    });
    return inOrder(ids, rows).map((row) => ({
      ...this.listingBase(row),
      kind: 'product',
      priceUnit: row.unit,
      moq: row.moq,
    }));
  }

  async services(ids: string[]): Promise<ListingResult[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.service.findMany({
      where: { AND: [{ id: { in: ids } }, INDEXABLE.listing] },
      include: listingCardInclude,
    });
    return inOrder(ids, rows).map((row) => ({
      ...this.listingBase(row),
      kind: 'service',
      priceUnit: row.priceUnit,
      moq: null,
    }));
  }

  async posts(ids: string[]): Promise<PostCard[]> {
    if (ids.length === 0) return [];
    const rows = await this.prisma.post.findMany({
      where: { AND: [{ id: { in: ids } }, INDEXABLE.post] },
      include: {
        business: { include: summaryInclude },
        media: { ...firstImage, where: { upload: { contentType: { startsWith: 'image/' } } } },
      },
    });
    return inOrder(ids, rows).map((row) => ({
      id: row.id,
      business: toBusinessSummary(row.business, this.mediaUrl),
      type: row.type,
      excerpt: excerpt(row.body),
      offerTag: row.offerTag,
      image: toMedia(row.media[0]?.upload ?? null, this.mediaUrl),
      likeCount: row.likeCount,
      commentCount: row.commentCount,
      publishedAt: row.publishedAt?.toISOString() ?? null,
    }));
  }

  private listingBase(row: {
    id: string;
    title: string;
    pricePaise: bigint | null;
    availability: ListingResult['availability'];
    publishedAt: Date | null;
    business: Parameters<typeof toBusinessSummary>[0];
    category: Parameters<typeof toCategoryRef>[0];
    media: { upload: { id: string; key: string } }[];
  }) {
    return {
      id: row.id,
      business: toBusinessSummary(row.business, this.mediaUrl),
      title: row.title,
      category: toCategoryRef(row.category),
      price: toMoney(row.pricePaise),
      image: toMedia(row.media[0]?.upload ?? null, this.mediaUrl),
      availability: row.availability,
      publishedAt: row.publishedAt?.toISOString() ?? null,
    };
  }
}
