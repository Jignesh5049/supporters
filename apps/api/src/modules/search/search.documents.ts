import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { PUBLIC_OWNER, isPremium, toRating } from '../businesses/businesses.service';
import { PUBLIC_LISTING } from '../listings/listings.service';
import { PUBLIC_POST } from '../posts/posts.service';
import type { SearchEntity } from './meili';

/**
 * Meilisearch documents. They hold what search matches, filters and sorts on,
 * never contact details; results are re-read from PostgreSQL before they are
 * returned. Times are Unix milliseconds so they sort as numbers.
 */
export interface BusinessDoc {
  id: string;
  slug: string;
  name: string;
  about: string;
  tags: string[];
  categoryNames: string[];
  /** The category and subcategory slugs, so a category filter matches both levels. */
  categorySlugs: string[];
  cityId: string;
  cityName: string;
  stateCode: string;
  businessType: string;
  isVerified: boolean;
  /** 1 while the business is Premium, else 0 (the search boost). */
  featured: number;
  /**
   * The shown average of visible reviews. Left out while the business is "New" (under 3
   * reviews), so `ratingMin` excludes it and `sort=rating` puts it last.
   */
  rating?: number;
  createdAt: number;
}

interface SellerFields {
  businessId: string;
  businessName: string;
  cityId: string;
  cityName: string;
  stateCode: string;
  businessType: string;
  isVerified: boolean;
  /** 1 while the business is Premium, else 0 (the search boost). */
  featured: number;
}

export interface ListingDoc extends SellerFields {
  id: string;
  title: string;
  description: string;
  /** Spec values (products) or features (services). */
  details: string[];
  categoryNames: string[];
  categorySlugs: string[];
  /** Left out for "Ask for price", so price filters skip it and price sorts put it last. */
  pricePaise?: number;
  availability: string;
  /** Products only. No MOQ means one unit. */
  moq?: number;
  publishedAt: number;
}

export interface PostDoc extends SellerFields {
  id: string;
  body: string;
  offerTag: string;
  postType: string;
  /** The business's category and subcategory. */
  categorySlugs: string[];
  publishedAt: number;
}

const millis = (date: Date | null) => date?.getTime() ?? 0;

/**
 * Premium is time-limited, so the flag goes stale when it ends: the worker's
 * hourly `search-premium-expiry` job re-syncs businesses whose Premium just ended.
 */
const featured = (business: { premiumUntil: Date | null }) => (isPremium(business) ? 1 : 0);

const sellerInclude = {
  city: { include: { state: true } },
  category: true,
  subcategory: true,
} satisfies Prisma.BusinessInclude;
type SellerRow = Prisma.BusinessGetPayload<{ include: typeof sellerInclude }>;

const categoryInclude = { include: { parent: true } } as const;
type CategoryRow = Prisma.CategoryGetPayload<typeof categoryInclude>;

/** A category and, for a subcategory, its parent. */
const categoryLevels = (category: CategoryRow) =>
  category.parent ? [category, category.parent] : [category];

const sellerFields = (business: SellerRow): SellerFields => ({
  businessId: business.id,
  businessName: business.name,
  cityId: business.cityId,
  cityName: business.city.name,
  stateCode: business.city.state.code,
  businessType: business.type,
  isVerified: business.verificationStatus === 'verified',
  featured: featured(business),
});

const businessCategories = (business: SellerRow) =>
  business.subcategory ? [business.category, business.subcategory] : [business.category];

/** Indexable rows only: the same rules as the public pages (published, not deleted, owner active). */
export const INDEXABLE = {
  business: PUBLIC_OWNER,
  listing: PUBLIC_LISTING,
  post: PUBLIC_POST,
} as const;

/** Which rows to load: some ids, one business's, or a batch after an id (full reindex). */
export interface DocFilter {
  ids?: string[];
  businessId?: string;
  afterId?: string;
  take?: number;
}

const idWhere = (filter: DocFilter) => ({
  ...(filter.ids ? { id: { in: filter.ids } } : {}),
  ...(filter.afterId ? { id: { gt: filter.afterId } } : {}),
});

const ownedBy = (filter: DocFilter) => (filter.businessId ? { businessId: filter.businessId } : {});

const findArgs = (filter: DocFilter) => ({
  orderBy: { id: 'asc' as const },
  ...(filter.take ? { take: filter.take } : {}),
});

export async function loadBusinessDocs(
  prisma: PrismaClient,
  filter: DocFilter,
): Promise<BusinessDoc[]> {
  const rows = await prisma.business.findMany({
    where: {
      AND: [
        idWhere(filter),
        filter.businessId ? { id: filter.businessId } : {},
        INDEXABLE.business,
      ],
    },
    include: sellerInclude,
    ...findArgs(filter),
  });
  return rows.map((row) => {
    const categories = businessCategories(row);
    const { average } = toRating(row);
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      about: row.about ?? '',
      tags: row.tags,
      categoryNames: categories.map((category) => category.name),
      categorySlugs: categories.map((category) => category.slug),
      cityId: row.cityId,
      cityName: row.city.name,
      stateCode: row.city.state.code,
      businessType: row.type,
      isVerified: row.verificationStatus === 'verified',
      featured: featured(row),
      ...(average !== null ? { rating: average } : {}),
      createdAt: millis(row.createdAt),
    };
  });
}

const listingDocInclude = {
  business: { include: sellerInclude },
  category: categoryInclude,
} as const;

const listingDoc = (
  row: {
    id: string;
    title: string;
    description: string;
    pricePaise: bigint | null;
    availability: string;
    publishedAt: Date | null;
    business: SellerRow;
    category: CategoryRow;
  },
  details: string[],
): ListingDoc => {
  const categories = categoryLevels(row.category);
  return {
    ...sellerFields(row.business),
    id: row.id,
    title: row.title,
    description: row.description,
    details,
    categoryNames: categories.map((category) => category.name),
    categorySlugs: categories.map((category) => category.slug),
    ...(row.pricePaise === null ? {} : { pricePaise: Number(row.pricePaise) }),
    availability: row.availability,
    publishedAt: millis(row.publishedAt),
  };
};

const specValues = (specs: Prisma.JsonValue): string[] =>
  Array.isArray(specs)
    ? specs.flatMap((spec) =>
        spec && typeof spec === 'object' && 'value' in spec && typeof spec.value === 'string'
          ? [spec.value]
          : [],
      )
    : [];

export async function loadProductDocs(
  prisma: PrismaClient,
  filter: DocFilter,
): Promise<ListingDoc[]> {
  const rows = await prisma.product.findMany({
    where: { AND: [idWhere(filter), ownedBy(filter), INDEXABLE.listing] },
    include: listingDocInclude,
    ...findArgs(filter),
  });
  return rows.map((row) => ({ ...listingDoc(row, specValues(row.specs)), moq: row.moq ?? 1 }));
}

export async function loadServiceDocs(
  prisma: PrismaClient,
  filter: DocFilter,
): Promise<ListingDoc[]> {
  const rows = await prisma.service.findMany({
    where: { AND: [idWhere(filter), ownedBy(filter), INDEXABLE.listing] },
    include: listingDocInclude,
    ...findArgs(filter),
  });
  return rows.map((row) => listingDoc(row, row.features));
}

export async function loadPostDocs(prisma: PrismaClient, filter: DocFilter): Promise<PostDoc[]> {
  const rows = await prisma.post.findMany({
    where: { AND: [idWhere(filter), ownedBy(filter), INDEXABLE.post] },
    include: { business: { include: sellerInclude } },
    ...findArgs(filter),
  });
  return rows.map((row) => ({
    ...sellerFields(row.business),
    id: row.id,
    body: row.body,
    offerTag: row.offerTag ?? '',
    postType: row.type,
    categorySlugs: businessCategories(row.business).map((category) => category.slug),
    publishedAt: millis(row.publishedAt),
  }));
}

export type SearchDoc = BusinessDoc | ListingDoc | PostDoc;

export const LOADERS: Record<
  SearchEntity,
  (prisma: PrismaClient, filter: DocFilter) => Promise<SearchDoc[]>
> = {
  business: loadBusinessDocs,
  product: loadProductDocs,
  service: loadServiceDocs,
  post: loadPostDocs,
};
