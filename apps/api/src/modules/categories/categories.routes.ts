import { categoriesResponseSchema } from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { PUBLIC_CACHE_1H } from '../places/places.routes';

export const categoriesRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/categories',
    { schema: { response: { 200: categoriesResponseSchema } } },
    async (_request, reply) => {
      reply.header('cache-control', PUBLIC_CACHE_1H);
      return { data: await app.services.categories.tree() };
    },
  );
};
