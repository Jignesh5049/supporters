import {
  ProductAvailability,
  SEARCH_LIMITS,
  type SearchHit,
  type SearchQuery,
  type SearchResponse,
  type SearchType,
  ServiceAvailability,
  type Suggestion,
} from '@supporters/shared';
import type { Meilisearch } from 'meilisearch';
import { z } from 'zod';
import { invalidField } from '../../lib/errors';
import { SEARCH_INDEX } from './meili';
import type { SearchCards } from './search.cards';

/** A Meilisearch filter value, double-quoted and escaped. */
const quote = (value: string) => JSON.stringify(value);

const PRODUCT_AVAILABILITY: ReadonlySet<string> = new Set(Object.values(ProductAvailability));
const SERVICE_AVAILABILITY: ReadonlySet<string> = new Set(Object.values(ServiceAvailability));

const isListing = (type: SearchType) => type === 'product' || type === 'service';

/** Meilisearch filter expressions for a query; filters that don't apply to the type are skipped. */
export function buildFilters(query: SearchQuery): string[] {
  const { type } = query;
  const filters: string[] = [];
  if (query.category) filters.push(`categorySlugs = ${quote(query.category)}`);
  if (query.city) filters.push(`cityId = ${quote(query.city)}`);
  if (query.state) filters.push(`stateCode = ${quote(query.state)}`);
  if (query.businessType) filters.push(`businessType = ${quote(query.businessType)}`);
  // "Verified only" is a switch: false means no filter, not "unverified only".
  if (query.verified) filters.push('isVerified = true');
  if (isListing(type)) {
    if (query.priceMin !== undefined) filters.push(`pricePaise >= ${query.priceMin}`);
    if (query.priceMax !== undefined) filters.push(`pricePaise <= ${query.priceMax}`);
    const values = type === 'product' ? PRODUCT_AVAILABILITY : SERVICE_AVAILABILITY;
    if (query.availability && values.has(query.availability)) {
      filters.push(`availability = ${quote(query.availability)}`);
    }
  }
  if (type === 'product' && query.moqMax !== undefined) filters.push(`moq <= ${query.moqMax}`);
  if (type === 'business' && query.ratingMin !== undefined) {
    filters.push(`rating >= ${query.ratingMin}`);
  }
  return filters;
}

/**
 * Meilisearch sort for a query. A sort that doesn't apply to the type falls
 * back to relevance; browsing with no text and no sort shows the newest first.
 */
export function buildSort(query: SearchQuery): string[] {
  const newest = query.type === 'business' ? 'createdAt:desc' : 'publishedAt:desc';
  switch (query.sort) {
    case 'newest':
      return [newest];
    case 'rating':
      if (query.type === 'business') return ['rating:desc'];
      break;
    case 'price_asc':
      if (isListing(query.type)) return ['pricePaise:asc'];
      break;
    case 'price_desc':
      if (isListing(query.type)) return ['pricePaise:desc'];
      break;
    case 'relevance':
      break;
  }
  return query.q === '' ? [newest] : [];
}

// Meilisearch only pages by offset. The cursor wraps the offset so the API
// keeps its `{ data, nextCursor }` contract (backend spec, Pagination).
const offsetSchema = z.coerce.number().int().min(0).max(SEARCH_LIMITS.maxTotalHits);

export const encodeOffsetCursor = (offset: number) =>
  Buffer.from(`o:${offset}`, 'utf8').toString('base64url');

export function decodeOffsetCursor(cursor: string | undefined): number {
  if (cursor === undefined) return 0;
  const text = Buffer.from(cursor, 'base64url').toString('utf8');
  const offset = text.startsWith('o:') ? offsetSchema.safeParse(text.slice(2)) : null;
  if (!offset?.success) throw invalidField('query.cursor', 'Invalid cursor');
  return offset.data;
}

const SUGGEST_TYPES = ['business', 'product', 'service'] as const;

export class SearchService {
  constructor(
    private readonly client: Meilisearch,
    private readonly cards: SearchCards,
  ) {}

  async search(query: SearchQuery): Promise<SearchResponse> {
    const offset = decodeOffsetCursor(query.cursor);
    const limit = Math.min(query.limit, SEARCH_LIMITS.maxTotalHits - offset);
    if (limit <= 0) return { data: [], nextCursor: null, estimatedTotal: 0 };

    const result = await this.client
      .index<{ id: string }>(SEARCH_INDEX[query.type])
      .search(query.q, {
        filter: buildFilters(query),
        sort: buildSort(query),
        offset,
        limit,
        attributesToRetrieve: ['id'],
      });
    const ids = result.hits.map((hit) => hit.id);
    const total = Math.min(result.estimatedTotalHits, SEARCH_LIMITS.maxTotalHits);
    const next = offset + result.hits.length;
    return {
      data: await this.hits(query.type, ids),
      nextCursor: result.hits.length === limit && next < total ? encodeOffsetCursor(next) : null,
      estimatedTotal: total,
    };
  }

  /** Up to 8 business names and listing titles, merged by relevance (federated search). */
  async suggest(q: string): Promise<Suggestion[]> {
    const result = await this.client.multiSearch<{
      federation: { limit: number };
      queries: {
        indexUid: string;
        q: string;
        attributesToRetrieve: string[];
        attributesToSearchOn: string[];
      }[];
    }>({
      federation: { limit: SEARCH_LIMITS.suggestMax },
      queries: SUGGEST_TYPES.map((type) => ({
        indexUid: SEARCH_INDEX[type],
        q,
        attributesToRetrieve: ['id'],
        // Names and titles only: a product shouldn't be suggested for its seller's name.
        attributesToSearchOn: [type === 'business' ? 'name' : 'title'],
      })),
    });
    const typeOf = new Map<string, (typeof SUGGEST_TYPES)[number]>(
      SUGGEST_TYPES.map((type) => [SEARCH_INDEX[type], type]),
    );
    const ordered = result.hits.flatMap((hit) => {
      const type = typeOf.get(hit._federation?.indexUid ?? '');
      return type && typeof hit.id === 'string' ? [{ type, id: hit.id }] : [];
    });
    const idsOf = (type: SearchType) =>
      ordered.filter((hit) => hit.type === type).map((hit) => hit.id);

    // Labels come from PostgreSQL, so nothing hidden since the last index update shows.
    const [businesses, products, services] = await Promise.all([
      this.cards.businesses(idsOf('business')),
      this.cards.products(idsOf('product')),
      this.cards.services(idsOf('service')),
    ]);
    const labels = new Map<string, Suggestion>([
      ...businesses.map(
        (row) =>
          [row.id, { type: 'business', id: row.id, label: row.name, slug: row.slug }] as const,
      ),
      ...[...products, ...services].map(
        (row) => [row.id, { type: row.kind, id: row.id, label: row.title, slug: null }] as const,
      ),
    ]);
    return ordered.flatMap((hit) => labels.get(hit.id) ?? []);
  }

  private async hits(type: SearchType, ids: string[]): Promise<SearchHit[]> {
    switch (type) {
      case 'business':
        return (await this.cards.businesses(ids)).map((business) => ({ type, business }));
      case 'product':
        return (await this.cards.products(ids)).map((listing) => ({ type, listing }));
      case 'service':
        return (await this.cards.services(ids)).map((listing) => ({ type, listing }));
      case 'post':
        return (await this.cards.posts(ids)).map((post) => ({ type, post }));
    }
  }
}
