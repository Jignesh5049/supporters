import { z } from 'zod';

/** A state or union territory. `code` is its ISO 3166-2:IN suffix, e.g. `MH`. */
export const stateSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
});
export type State = z.infer<typeof stateSchema>;

export const citySchema = z.object({
  id: z.uuid(),
  name: z.string(),
  stateCode: z.string(),
});
export type City = z.infer<typeof citySchema>;

export const stateCodeSchema = z
  .string()
  .regex(/^[A-Za-z]{2}$/, 'Use the two-letter state code')
  .transform((value) => value.toUpperCase());

export const citiesQuerySchema = z.strictObject({ state: stateCodeSchema });
export type CitiesQuery = z.infer<typeof citiesQuerySchema>;

export const statesResponseSchema = z.object({ data: z.array(stateSchema) });
export const citiesResponseSchema = z.object({ data: z.array(citySchema) });
