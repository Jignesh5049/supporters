import {
  pageSchema,
  saveParamsSchema,
  saveStateSchema,
  savedItemSchema,
  savesQuerySchema,
} from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { signedIn } from '../businesses/businesses.routes';

export const savesRoutes: FastifyPluginAsyncZod = async (app) => {
  const { saves } = app.services;

  app.put(
    '/saves/:type/:id',
    {
      config: { auth: 'user' },
      schema: { params: saveParamsSchema, response: { 200: saveStateSchema } },
    },
    async (request) =>
      saves.setSaved(signedIn(request.auth).userId, request.params.type, request.params.id, true),
  );

  app.delete(
    '/saves/:type/:id',
    {
      config: { auth: 'user' },
      schema: { params: saveParamsSchema, response: { 200: saveStateSchema } },
    },
    async (request) =>
      saves.setSaved(signedIn(request.auth).userId, request.params.type, request.params.id, false),
  );

  app.get(
    '/me/saves',
    {
      config: { auth: 'user' },
      schema: { querystring: savesQuerySchema, response: { 200: pageSchema(savedItemSchema) } },
    },
    async (request) => saves.list(signedIn(request.auth).userId, request.query),
  );
};
