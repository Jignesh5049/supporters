import { z } from 'zod';
import { citySchema } from './places';
import { businessCardSchema, listingResultSchema } from './search';

// Discover (product spec, Discovery and buyer requirements: "Browse").

/** `GET /v1/discover`. Guests pass `city` for Near you; signed-in users get their own city. */
export const discoverQuerySchema = z.strictObject({
  city: z.uuid().optional(),
});
export type DiscoverQuery = z.infer<typeof discoverQuerySchema>;

/**
 * The Discover page, every section at once (each up to `SEARCH_LIMITS.discoverSectionSize`).
 *
 * - `trending`: most new followers plus enquiries in the last 7 days.
 * - `featured`: published listings of Premium businesses, newest first.
 * - `nearYou`: businesses in the viewer's city (`city` is null when it isn't known).
 * - `suggested`: businesses in the viewer's interest categories that they don't follow yet;
 *   always empty for guests.
 *
 * The viewer's own business is left out of every section.
 */
export const discoverResponseSchema = z.object({
  trending: z.array(businessCardSchema),
  featured: z.array(listingResultSchema),
  nearYou: z.object({ city: citySchema.nullable(), data: z.array(businessCardSchema) }),
  suggested: z.array(businessCardSchema),
});
export type DiscoverResponse = z.infer<typeof discoverResponseSchema>;
