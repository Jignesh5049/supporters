import { citiesQuerySchema, citiesResponseSchema, statesResponseSchema } from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { invalidField } from '../../lib/errors';

/** Reference data changes rarely: public, cached for an hour (backend spec, endpoint map). */
export const PUBLIC_CACHE_1H = 'public, max-age=3600';

export const placesRoutes: FastifyPluginAsyncZod = async (app) => {
  const { places } = app.services;

  app.get(
    '/places/states',
    { schema: { response: { 200: statesResponseSchema } } },
    async (_request, reply) => {
      reply.header('cache-control', PUBLIC_CACHE_1H);
      return { data: await places.listStates() };
    },
  );

  app.get(
    '/places/cities',
    { schema: { querystring: citiesQuerySchema, response: { 200: citiesResponseSchema } } },
    async (request, reply) => {
      const cities = await places.listCities(request.query.state);
      if (!cities) throw invalidField('query.state', 'Unknown state');
      reply.header('cache-control', PUBLIC_CACHE_1H);
      return { data: cities };
    },
  );
};
