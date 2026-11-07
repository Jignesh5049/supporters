import {
  RATE_LIMITS,
  searchQuerySchema,
  searchResponseSchema,
  suggestQuerySchema,
  suggestResponseSchema,
} from '@supporters/shared';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { rateLimited } from '../../lib/errors';

export const searchRoutes: FastifyPluginAsyncZod = async (app) => {
  const { search } = app.services;

  /** 60 per minute per IP for each endpoint, on top of the global limit (backend spec, Limits). */
  const perIpLimit = (bucket: 'search' | 'suggest') => async (request: FastifyRequest) => {
    const { max, windowSec } = RATE_LIMITS.search;
    const result = await app.limiter.hit(`${bucket}:ip:${request.ip}`, max, windowSec);
    if (!result.allowed) throw rateLimited(Math.max(1, Math.ceil(result.resetMs / 1000)));
  };

  // Public, like the pages it finds.
  app.get(
    '/search',
    {
      onRequest: perIpLimit('search'),
      schema: { querystring: searchQuerySchema, response: { 200: searchResponseSchema } },
    },
    async (request) => search.search(request.query),
  );

  app.get(
    '/search/suggest',
    {
      onRequest: perIpLimit('suggest'),
      schema: { querystring: suggestQuerySchema, response: { 200: suggestResponseSchema } },
    },
    async (request) => ({ data: await search.suggest(request.query.q) }),
  );
};
