import { blockParamsSchema, blockStateSchema } from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { signedIn } from '../businesses/businesses.routes';

export const blocksRoutes: FastifyPluginAsyncZod = async (app) => {
  const { blocks } = app.services;

  app.put(
    '/blocks/:userId',
    {
      config: { auth: 'user' },
      schema: { params: blockParamsSchema, response: { 200: blockStateSchema } },
    },
    async (request) =>
      blocks.setBlocked(signedIn(request.auth).userId, request.params.userId, true),
  );

  app.delete(
    '/blocks/:userId',
    {
      config: { auth: 'user' },
      schema: { params: blockParamsSchema, response: { 200: blockStateSchema } },
    },
    async (request) =>
      blocks.setBlocked(signedIn(request.auth).userId, request.params.userId, false),
  );
};
