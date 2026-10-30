import { z } from 'zod';

/** A category or subcategory, as embedded in businesses and listings. */
export const categoryRefSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  parentId: z.uuid().nullable(),
});
export type CategoryRef = z.infer<typeof categoryRefSchema>;

/** The two-level taxonomy (product spec, Listings): categories, each with subcategories. */
export const categoryTreeSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  subcategories: z.array(z.object({ id: z.uuid(), name: z.string(), slug: z.string() })),
});
export type CategoryTree = z.infer<typeof categoryTreeSchema>;

export const categoriesResponseSchema = z.object({ data: z.array(categoryTreeSchema) });
