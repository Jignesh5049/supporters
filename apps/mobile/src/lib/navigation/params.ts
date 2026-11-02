import { z } from 'zod';

/** Ids and slugs in route params: deep links are untrusted input (mobile spec, Security). */
export const routeIdSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z0-9_-]+$/);

/** Returns the param when it is a single valid id, otherwise null. */
export function parseRouteId(value: string | string[] | undefined): string | null {
  const result = routeIdSchema.safeParse(value);
  return result.success ? result.data : null;
}

/** Parses a route param with a shared schema (a slug, a uuid). Null when it doesn't match. */
export function parseRouteParam<T>(
  schema: z.ZodType<T>,
  value: string | string[] | undefined,
): T | null {
  const result = schema.safeParse(value);
  return result.success ? result.data : null;
}
