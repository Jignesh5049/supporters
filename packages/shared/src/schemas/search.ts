import { z } from 'zod';
import { businessSummarySchema } from './business';
import { listingCardSchema } from './chat';
import { buyerRequirementSchema } from './requirements';

export const searchTypeSchema = z.enum([
  'all',
  'businesses',
  'products',
  'services',
  'requirements',
]);
export type SearchType = z.infer<typeof searchTypeSchema>;

export const searchQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  type: searchTypeSchema.default('all'),
  category: z.string().optional(),
  city: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type SearchQuery = z.input<typeof searchQuerySchema>;
export type SearchQueryOutput = z.output<typeof searchQuerySchema>;

export const searchCountsSchema = z.object({
  all: z.number().default(0),
  businesses: z.number().default(0),
  products: z.number().default(0),
  services: z.number().default(0),
  requirements: z.number().default(0),
});
export type SearchCounts = z.infer<typeof searchCountsSchema>;

export const searchResultSchema = z.object({
  query: z.string().default(''),
  counts: searchCountsSchema,
  businesses: z.array(businessSummarySchema).default([]),
  products: z.array(listingCardSchema).default([]),
  services: z.array(listingCardSchema).default([]),
  requirements: z.array(buyerRequirementSchema).default([]),
});
export type SearchResult = z.infer<typeof searchResultSchema>;
