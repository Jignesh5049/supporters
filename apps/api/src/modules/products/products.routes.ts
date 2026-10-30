import {
  createProductSchema,
  listingIdParamsSchema,
  myListingsQuerySchema,
  pageSchema,
  paginationQuerySchema,
  productSchema,
  updateProductSchema,
} from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { signedIn } from '../businesses/businesses.routes';

export const productsRoutes: FastifyPluginAsyncZod = async (app) => {
  const { products } = app.services;

  app.get(
    '/products/:id',
    { schema: { params: listingIdParamsSchema, response: { 200: productSchema } } },
    async (request) => products.getPublic(request.params.id),
  );

  app.get(
    '/businesses/:id/products',
    {
      schema: {
        params: listingIdParamsSchema,
        querystring: paginationQuerySchema,
        response: { 200: pageSchema(productSchema) },
      },
    },
    async (request) => products.listPublic(request.params.id, request.query),
  );

  app.get(
    '/me/business/products',
    {
      config: { auth: 'user' },
      schema: { querystring: myListingsQuerySchema, response: { 200: pageSchema(productSchema) } },
    },
    async (request) => products.listMine(signedIn(request.auth).userId, request.query),
  );

  app.post(
    '/me/business/products',
    {
      config: { auth: 'user' },
      schema: { body: createProductSchema, response: { 201: productSchema } },
    },
    async (request, reply) => {
      const product = await products.create(signedIn(request.auth).userId, request.body);
      return reply.status(201).send(product);
    },
  );

  app.patch(
    '/me/business/products/:id',
    {
      config: { auth: 'user' },
      schema: {
        params: listingIdParamsSchema,
        body: updateProductSchema,
        response: { 200: productSchema },
      },
    },
    async (request) =>
      products.update(signedIn(request.auth).userId, request.params.id, request.body),
  );

  app.delete(
    '/me/business/products/:id',
    { config: { auth: 'user' }, schema: { params: listingIdParamsSchema } },
    async (request, reply) => {
      await products.remove(signedIn(request.auth).userId, request.params.id);
      return reply.status(204).send();
    },
  );
};
