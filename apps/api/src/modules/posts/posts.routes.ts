import {
  createPostSchema,
  myPostsQuerySchema,
  pageSchema,
  paginationQuerySchema,
  postIdParamsSchema,
  postSchema,
  updatePostSchema,
} from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { signedIn } from '../businesses/businesses.routes';

export const postsRoutes: FastifyPluginAsyncZod = async (app) => {
  const { posts } = app.services;

  app.get(
    '/posts/:id',
    { schema: { params: postIdParamsSchema, response: { 200: postSchema } } },
    async (request) => posts.getPublic(request.params.id),
  );

  app.get(
    '/businesses/:id/posts',
    {
      schema: {
        params: postIdParamsSchema,
        querystring: paginationQuerySchema,
        response: { 200: pageSchema(postSchema) },
      },
    },
    async (request) => posts.listPublic(request.params.id, request.query),
  );

  app.get(
    '/me/business/posts',
    {
      config: { auth: 'user' },
      schema: { querystring: myPostsQuerySchema, response: { 200: pageSchema(postSchema) } },
    },
    async (request) => posts.listMine(signedIn(request.auth).userId, request.query),
  );

  app.post(
    '/me/business/posts',
    {
      config: { auth: 'user' },
      schema: { body: createPostSchema, response: { 201: postSchema } },
    },
    async (request, reply) => {
      const post = await posts.create(signedIn(request.auth).userId, request.body);
      return reply.status(201).send(post);
    },
  );

  app.patch(
    '/me/business/posts/:id',
    {
      config: { auth: 'user' },
      schema: { params: postIdParamsSchema, body: updatePostSchema, response: { 200: postSchema } },
    },
    async (request) => posts.update(signedIn(request.auth).userId, request.params.id, request.body),
  );

  app.delete(
    '/me/business/posts/:id',
    { config: { auth: 'user' }, schema: { params: postIdParamsSchema } },
    async (request, reply) => {
      await posts.remove(signedIn(request.auth).userId, request.params.id);
      return reply.status(204).send();
    },
  );
};
