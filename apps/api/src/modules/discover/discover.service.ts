import {
  type BusinessCard,
  type DiscoverQuery,
  type DiscoverResponse,
  type ListingResult,
  SEARCH_LIMITS,
} from '@supporters/shared';
import type { Prisma, PrismaClient } from '../../generated/prisma/client';
import { toCity } from '../places/places.service';
import { businessCardInclude, type SearchCards } from '../search/search.cards';
import { INDEXABLE } from '../search/search.documents';

const DAY_MS = 24 * 60 * 60 * 1000;
const SIZE = SEARCH_LIMITS.discoverSectionSize;

/** Most followed first; the newest business breaks ties. */
const POPULAR_ORDER = [
  { followerCount: 'desc' },
  { id: 'desc' },
] satisfies Prisma.BusinessOrderByWithRelationInput[];

interface Viewer {
  userId: string;
  cityId: string | null;
  businessId: string | null;
}

/**
 * The Discover page (product spec, Discovery: "Browse"). Sections are read
 * from PostgreSQL, not the search index: they are rankings over follows,
 * enquiries, plans and interests rather than text matches.
 */
export class DiscoverService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cards: SearchCards,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async sections(userId: string | null, query: DiscoverQuery): Promise<DiscoverResponse> {
    const viewer = userId ? await this.viewer(userId) : null;
    const cityId = query.city ?? viewer?.cityId ?? null;
    const exclude = viewer?.businessId ? [viewer.businessId] : [];
    const [trending, featured, nearYou, suggested] = await Promise.all([
      this.trending(exclude),
      this.featured(exclude),
      this.nearYou(cityId, exclude),
      viewer ? this.suggested(viewer, exclude) : Promise.resolve([]),
    ]);
    return { trending, featured, nearYou, suggested };
  }

  /**
   * Trending score = people who started following in the last 7 days (and still
   * follow) + distinct buyers who sent an enquiry in the last 7 days. A buyer
   * counts once per business however many enquiries they send, so one account
   * can't push a business up. Businesses scoring 0 are left out; ties go to the
   * larger following, then the newest business.
   */
  private async trending(exclude: string[]): Promise<BusinessCard[]> {
    const since = new Date(this.now().getTime() - SEARCH_LIMITS.trendingWindowDays * DAY_MS);
    const excluded = exclude[0] ?? '00000000-0000-0000-0000-000000000000';
    // Twice the section size, so businesses hidden by the public-page rules still leave a full row.
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT b.id FROM businesses b
      LEFT JOIN (
        SELECT business_id, count(*) AS n FROM follows
        WHERE created_at >= ${since} GROUP BY business_id
      ) f ON f.business_id = b.id
      LEFT JOIN (
        SELECT business_id, count(DISTINCT user_id) AS n FROM enquiries
        WHERE created_at >= ${since} GROUP BY business_id
      ) e ON e.business_id = b.id
      WHERE (f.n IS NOT NULL OR e.n IS NOT NULL) AND b.id <> ${excluded}::uuid
      ORDER BY coalesce(f.n, 0) + coalesce(e.n, 0) DESC, b.follower_count DESC, b.id DESC
      LIMIT ${SIZE * 2}`;
    const cards = await this.cards.businesses(rows.map((row) => row.id));
    return cards.slice(0, SIZE);
  }

  /**
   * Published listings of Premium businesses, newest first. `premium_until`
   * is set by the payments module, so this follows the subscription.
   */
  private async featured(exclude: string[]): Promise<ListingResult[]> {
    const where = {
      AND: [
        INDEXABLE.listing,
        { business: { premiumUntil: { gt: this.now() }, id: { notIn: exclude } } },
      ],
    };
    const args = {
      where,
      orderBy: [{ publishedAt: 'desc' as const }, { id: 'desc' as const }],
      take: SIZE,
      select: { id: true, publishedAt: true },
    };
    const [products, services] = await Promise.all([
      this.prisma.product.findMany(args),
      this.prisma.service.findMany(args),
    ]);
    const [productCards, serviceCards] = await Promise.all([
      this.cards.products(products.map((row) => row.id)),
      this.cards.services(services.map((row) => row.id)),
    ]);
    return [...productCards, ...serviceCards]
      .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
      .slice(0, SIZE);
  }

  private async nearYou(
    cityId: string | null,
    exclude: string[],
  ): Promise<DiscoverResponse['nearYou']> {
    const city = cityId
      ? await this.prisma.city.findUnique({ where: { id: cityId }, include: { state: true } })
      : null;
    if (!city) return { city: null, data: [] };
    return { city: toCity(city), data: await this.popular({ cityId: city.id }, exclude) };
  }

  /** In the viewer's interest categories (either level), not followed yet. */
  private async suggested(viewer: Viewer, exclude: string[]): Promise<BusinessCard[]> {
    const interests = await this.prisma.userInterest.findMany({
      where: { userId: viewer.userId },
      select: { categoryId: true },
    });
    if (interests.length === 0) return [];
    const categoryIds = interests.map((row) => row.categoryId);
    return this.popular(
      {
        OR: [{ categoryId: { in: categoryIds } }, { subcategoryId: { in: categoryIds } }],
        followers: { none: { userId: viewer.userId } },
      },
      exclude,
    );
  }

  private async popular(where: Prisma.BusinessWhereInput, exclude: string[]) {
    const rows = await this.prisma.business.findMany({
      where: { AND: [where, { id: { notIn: exclude } }, INDEXABLE.business] },
      include: businessCardInclude,
      orderBy: POPULAR_ORDER,
      take: SIZE,
    });
    return rows.map((row) => this.cards.toBusinessCard(row));
  }

  private async viewer(userId: string): Promise<Viewer> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { cityId: true, business: { select: { id: true } } },
    });
    return { userId, cityId: user?.cityId ?? null, businessId: user?.business?.id ?? null };
  }
}
