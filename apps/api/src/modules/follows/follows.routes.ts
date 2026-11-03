import {
  followParamsSchema,
  followStateSchema,
  followerItemSchema,
  followingItemSchema,
  pageSchema,
  paginationQuerySchema,
} from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { signedIn } from '../businesses/businesses.routes';

export const followsRoutes: FastifyPluginAsyncZod = async (app) => {
  const { follows } = app.services;

  app.put(
    '/follows/:businessId',
    {
      config: { auth: 'user' },
      schema: { params: followParamsSchema, response: { 200: followStateSchema } },
    },
    async (request) =>
      follows.setFollowing(signedIn(request.auth).userId, request.params.businessId, true),
  );

  app.delete(
    '/follows/:businessId',
    {
      config: { auth: 'user' },
      schema: { params: followParamsSchema, response: { 200: followStateSchema } },
    },
    async (request) =>
      follows.setFollowing(signedIn(request.auth).userId, request.params.businessId, false),
  );

  app.get(
    '/me/following',
    {
      config: { auth: 'user' },
      schema: {
        querystring: paginationQuerySchema,
        response: { 200: pageSchema(followingItemSchema) },
      },
    },
    async (request) => follows.listFollowing(signedIn(request.auth).userId, request.query),
  );

  app.get(
    '/businesses/:id/followers',
    {
      schema: {
        params: z.strictObject({ id: z.uuid() }),
        querystring: paginationQuerySchema,
        response: { 200: pageSchema(followerItemSchema) },
      },
    },
    async (request) => follows.listFollowers(request.params.id, request.query),
  );
};
