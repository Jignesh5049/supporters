import { feedItemSchema, feedQuerySchema, feedSeenSchema, pageSchema } from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { signedIn } from '../businesses/businesses.routes';

export const feedRoutes: FastifyPluginAsyncZod = async (app) => {
  const { feed } = app.services;

  // Public: guests get the city (or All India) variant, signed-in users their own feed.
  app.get(
    '/feed',
    { schema: { querystring: feedQuerySchema, response: { 200: pageSchema(feedItemSchema) } } },
    async (request) => feed.feed(request.auth?.userId ?? null, request.query),
  );

  app.post(
    '/feed/seen',
    { config: { auth: 'user' }, schema: { body: feedSeenSchema } },
    async (request, reply) => {
      await feed.markSeen(signedIn(request.auth).userId, request.body.postIds);
      return reply.status(204).send();
    },
  );
};
