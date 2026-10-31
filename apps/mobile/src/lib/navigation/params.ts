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
