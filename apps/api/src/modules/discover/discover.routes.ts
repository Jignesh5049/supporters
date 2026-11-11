import { discoverQuerySchema, discoverResponseSchema } from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';

export const discoverRoutes: FastifyPluginAsyncZod = async (app) => {
  const { discover } = app.services;

  // Public: guests get Trending, Featured and (with `city`) Near you; Suggested needs a sign-in.
  app.get(
    '/discover',
    { schema: { querystring: discoverQuerySchema, response: { 200: discoverResponseSchema } } },
    async (request) => discover.sections(request.auth?.userId ?? null, request.query),
  );
};
