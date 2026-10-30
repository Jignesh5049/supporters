import 'server-only';
import { z } from 'zod';

const serverEnvSchema = z.object({
  /** Where the server reaches the API directly (Docker network in production). */
  API_INTERNAL_URL: z
    .url()
    .default('http://127.0.0.1:3001')
    .transform((value) => new URL(value).origin),
  /** The public origin. The API's CSRF check requires it as `Origin` on cookie writes. */
  APP_ORIGIN: z
    .url()
    .default('http://localhost:3000')
    .transform((value) => new URL(value).origin),
});

export const serverEnv = serverEnvSchema.parse({
  API_INTERNAL_URL: process.env.API_INTERNAL_URL,
  APP_ORIGIN: process.env.APP_ORIGIN,
});

export const apiUrl = (path: `/v1/${string}`) => `${serverEnv.API_INTERNAL_URL}${path}`;
