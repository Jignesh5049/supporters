import { z } from 'zod';
import { LISTING_LIMITS, PAGINATION, SEARCH_LIMITS } from '../limits';
import { businessSummarySchema, businessTypeSchema } from './business';
import { categoryRefSchema } from './categories';
import { moneySchema, slugPattern } from './common';
import { productAvailabilitySchema, serviceAvailabilitySchema } from './listings';
import { stateCodeSchema, stateSchema } from './places';
import { postTypeSchema } from './posts';
import { mediaSchema } from './uploads';

// Search (product spec, Discovery and buyer requirements; backend spec, endpoint map "Search").

/** The search box's tabs. */
export const SearchType = {
  Business: 'business',
  Product: 'product',
  Service: 'service',
  Post: 'post',
} as const;
export type SearchType = (typeof SearchType)[keyof typeof SearchType];
export const searchTypeSchema = z.enum(Object.values(SearchType));

export const SearchSort = {
  Relevance: 'relevance',
  Newest: 'newest',
  Rating: 'rating',
  PriceAsc: 'price_asc',
  PriceDesc: 'price_desc',
} as const;
export type SearchSort = (typeof SearchSort)[keyof typeof SearchSort];
export const searchSortSchema = z.enum(Object.values(SearchSort));

/** Products and services have different availability values; either is accepted. */
export const searchAvailabilitySchema = z.union([
  productAvailabilitySchema,
  serviceAvailabilitySchema,
]);
export type SearchAvailability = z.infer<typeof searchAvailabilitySchema>;

const searchTextSchema = z.string().trim().max(SEARCH_LIMITS.queryMax);
const priceSchema = z.coerce.number().int().min(0).max(LISTING_LIMITS.maxPricePaise);
const booleanQuerySchema = z.enum(['true', 'false']).transform((value) => value === 'true');

/**
 * `GET /v1/search`. Filters that don't apply to the chosen `type` are ignored
 * (so a client can keep its filters while switching tabs):
 *
 * | Filter | business | product | service | post |
 * | --- | --- | --- | --- | --- |
 * | `category`, `city`, `state`, `businessType`, `verified` | yes | yes | yes | yes |
 * | `priceMin`, `priceMax` (paise) | | yes | yes | |
 * | `availability` | | product values | service values | |
 * | `moqMax` | | yes | | |
 * | `ratingMin` | yes | | | |
 *
 * Listings and posts take `city`, `state`, `businessType` and `verified` from
 * their business. `category` is a category or subcategory slug; a category
 * also matches its subcategories. Sorts that don't apply fall back to relevance.
 *
 * Paging: Meilisearch pages by offset, so `cursor` is an opaque offset token
 * and results stop after `SEARCH_LIMITS.maxTotalHits`.
 */
export const searchQuerySchema = z
  .strictObject({
    q: searchTextSchema.default(''),
    type: searchTypeSchema.default(SearchType.Business),
    category: z.string().max(80).regex(slugPattern, 'Use a category slug').optional(),
    city: z.uuid().optional(),
    state: stateCodeSchema.optional(),
    businessType: businessTypeSchema.optional(),
    verified: booleanQuerySchema.optional(),
    priceMin: priceSchema.optional(),
    priceMax: priceSchema.optional(),
    availability: searchAvailabilitySchema.optional(),
    moqMax: z.coerce.number().int().min(1).max(LISTING_LIMITS.maxMoq).optional(),
    ratingMin: z.coerce.number().min(1).max(5).optional(),
    sort: searchSortSchema.default(SearchSort.Relevance),
    cursor: z.string().min(1).max(64).optional(),
    limit: z.coerce.number().int().min(1).max(PAGINATION.maxLimit).default(PAGINATION.defaultLimit),
  })
  .refine(
    (query) =>
      query.priceMin === undefined ||
      query.priceMax === undefined ||
      query.priceMin <= query.priceMax,
    { path: ['priceMax'], message: 'The maximum price must be at least the minimum' },
  );
export type SearchQuery = z.infer<typeof searchQuerySchema>;
export type SearchQueryInput = z.input<typeof searchQuerySchema>;

/** A business in search results and Discover sections. */
export const businessCardSchema = businessSummarySchema.extend({
  type: businessTypeSchema,
  category: categoryRefSchema,
  state: stateSchema,
  about: z.string().nullable(),
  followerCount: z.number().int(),
  /** Average of visible reviews to one decimal; null until there are enough (shows "New"). */
  rating: z.number().nullable(),
  reviewCount: z.number().int(),
});
export type BusinessCard = z.infer<typeof businessCardSchema>;

/** A product or service in search results and Discover sections. */
export const listingResultSchema = z.object({
  id: z.uuid(),
  kind: z.enum(['product', 'service']),
  business: businessSummarySchema,
  title: z.string(),
  category: categoryRefSchema,
  /** Null means "Ask for price". */
  price: moneySchema.nullable(),
  /** Products: per-unit, e.g. `kg`. Services: `per_hour`, `per_job`, and so on. */
  priceUnit: z.string().nullable(),
  image: mediaSchema.nullable(),
  availability: searchAvailabilitySchema,
  /** Products only. */
  moq: z.number().int().nullable(),
  publishedAt: z.iso.datetime().nullable(),
});
export type ListingResult = z.infer<typeof listingResultSchema>;

/** A post in search results. */
export const postCardSchema = z.object({
  id: z.uuid(),
  business: businessSummarySchema,
  type: postTypeSchema,
  /** The start of the body, cut at a word boundary. */
  excerpt: z.string(),
  offerTag: z.string().nullable(),
  image: mediaSchema.nullable(),
  likeCount: z.number().int(),
  commentCount: z.number().int(),
  publishedAt: z.iso.datetime().nullable(),
});
export type PostCard = z.infer<typeof postCardSchema>;

export const searchHitSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('business'), business: businessCardSchema }),
  z.object({ type: z.literal('product'), listing: listingResultSchema }),
  z.object({ type: z.literal('service'), listing: listingResultSchema }),
  z.object({ type: z.literal('post'), post: postCardSchema }),
]);
export type SearchHit = z.infer<typeof searchHitSchema>;

export const searchResponseSchema = z.object({
  data: z.array(searchHitSchema),
  nextCursor: z.string().nullable(),
  /** Meilisearch's estimate, capped at `SEARCH_LIMITS.maxTotalHits`. */
  estimatedTotal: z.number().int(),
});
export type SearchResponse = z.infer<typeof searchResponseSchema>;

/** `GET /v1/search/suggest?q=`: autocomplete from 2 characters. */
export const suggestQuerySchema = z.strictObject({
  q: searchTextSchema.min(SEARCH_LIMITS.suggestMinChars),
});
export type SuggestQuery = z.infer<typeof suggestQuerySchema>;

export const suggestionSchema = z.object({
  type: searchTypeSchema,
  id: z.uuid(),
  /** Business name, listing title, or the start of a post. */
  label: z.string(),
  /** Businesses only, for a direct link to the page. */
  slug: z.string().nullable(),
});
export type Suggestion = z.infer<typeof suggestionSchema>;

export const suggestResponseSchema = z.object({ data: z.array(suggestionSchema) });
export type SuggestResponse = z.infer<typeof suggestResponseSchema>;
