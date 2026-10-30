import {
  createServiceSchema,
  listingIdParamsSchema,
  myListingsQuerySchema,
  pageSchema,
  paginationQuerySchema,
  serviceSchema,
  updateServiceSchema,
} from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { signedIn } from '../businesses/businesses.routes';

export const servicesRoutes: FastifyPluginAsyncZod = async (app) => {
  const { services } = app.services;

  app.get(
    '/services/:id',
    { schema: { params: listingIdParamsSchema, response: { 200: serviceSchema } } },
    async (request) => services.getPublic(request.params.id),
  );

  app.get(
    '/businesses/:id/services',
    {
      schema: {
        params: listingIdParamsSchema,
        querystring: paginationQuerySchema,
        response: { 200: pageSchema(serviceSchema) },
      },
    },
    async (request) => services.listPublic(request.params.id, request.query),
  );

  app.get(
    '/me/business/services',
    {
      config: { auth: 'user' },
      schema: { querystring: myListingsQuerySchema, response: { 200: pageSchema(serviceSchema) } },
    },
    async (request) => services.listMine(signedIn(request.auth).userId, request.query),
  );

  app.post(
    '/me/business/services',
    {
      config: { auth: 'user' },
      schema: { body: createServiceSchema, response: { 201: serviceSchema } },
    },
    async (request, reply) => {
      const service = await services.create(signedIn(request.auth).userId, request.body);
      return reply.status(201).send(service);
    },
  );

  app.patch(
    '/me/business/services/:id',
    {
      config: { auth: 'user' },
      schema: {
        params: listingIdParamsSchema,
        body: updateServiceSchema,
        response: { 200: serviceSchema },
      },
    },
    async (request) =>
      services.update(signedIn(request.auth).userId, request.params.id, request.body),
  );

  app.delete(
    '/me/business/services/:id',
    { config: { auth: 'user' }, schema: { params: listingIdParamsSchema } },
    async (request, reply) => {
      await services.remove(signedIn(request.auth).userId, request.params.id);
      return reply.status(204).send();
    },
  );
};
