import { z } from 'zod';

export const blockParamsSchema = z.strictObject({ userId: z.uuid() });

/** Blocking is idempotent; both PUT and DELETE answer with the resulting state. */
export const blockStateSchema = z.object({ isBlocked: z.boolean() });
export type BlockState = z.infer<typeof blockStateSchema>;
