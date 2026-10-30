import { z } from 'zod';
import { LISTING_LIMITS, PAGINATION } from '../limits';

/** `?cursor=<opaque>&limit=20` (backend spec, API design: Pagination). */
export const paginationQuerySchema = z.strictObject({
  cursor: z.string().min(1).max(128).optional(),
  limit: z.coerce.number().int().min(1).max(PAGINATION.maxLimit).default(PAGINATION.defaultLimit),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** `{ data: [...], nextCursor }`; `nextCursor` is null on the last page. */
export const pageSchema = <T extends z.ZodType>(item: T) =>
  z.object({ data: z.array(item), nextCursor: z.string().nullable() });
export interface Page<T> {
  data: T[];
  nextCursor: string | null;
}

/** Money in JSON: integer paise, always INR (backend spec, Architecture). */
export const moneySchema = z.object({
  amountPaise: z.number().int(),
  currency: z.literal('INR'),
});
export type Money = z.infer<typeof moneySchema>;

export const moneyInputSchema = z.strictObject({
  amountPaise: z.number().int().min(1).max(LISTING_LIMITS.maxPricePaise),
  currency: z.literal('INR').default('INR'),
});
export type MoneyInput = z.input<typeof moneyInputSchema>;

/** Lower-case words joined by single hyphens, e.g. `asha-traders`. */
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Links shown on public pages: http(s) only, so a `javascript:` URL can never render. */
export const webUrlSchema = (max: number) =>
  z.url({ protocol: /^https?$/, hostname: z.regexes.domain }).max(max);
