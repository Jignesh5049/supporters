import {
  businessSchema,
  businessSlugSchema,
  createBusinessSchema,
  myBusinessSchema,
  updateBusinessSchema,
} from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { unauthenticated } from '../../lib/errors';
import type { AuthContext } from '../../plugins/auth';

/** Routes marked `auth: 'user'` have rejected guests before the handler runs. */
export const signedIn = (auth: AuthContext | null): AuthContext => {
  if (!auth) throw unauthenticated();
  return auth;
};

export const businessesRoutes: FastifyPluginAsyncZod = async (app) => {
  const { businesses } = app.services;

  app.get(
    '/businesses/:slug',
    {
      schema: {
        params: z.strictObject({ slug: businessSlugSchema }),
        response: { 200: businessSchema },
      },
    },
    async (request) => businesses.getPublic(request.params.slug),
  );

  app.post(
    '/me/business',
    {
      config: { auth: 'user' },
      schema: { body: createBusinessSchema, response: { 201: myBusinessSchema } },
    },
    async (request, reply) => {
      const business = await businesses.create(signedIn(request.auth).userId, request.body);
      return reply.status(201).send(business);
    },
  );

  app.get(
    '/me/business',
    { config: { auth: 'user' }, schema: { response: { 200: myBusinessSchema } } },
    async (request) => businesses.getMine(signedIn(request.auth).userId),
  );

  app.patch(
    '/me/business',
    {
      config: { auth: 'user' },
      schema: { body: updateBusinessSchema, response: { 200: myBusinessSchema } },
    },
    async (request) => businesses.update(signedIn(request.auth).userId, request.body),
  );
};
