import {
  commentIdParamsSchema,
  commentSchema,
  commentsQuerySchema,
  createCommentSchema,
  pageSchema,
  postIdParamsSchema,
} from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { signedIn } from '../businesses/businesses.routes';

export const commentsRoutes: FastifyPluginAsyncZod = async (app) => {
  const { comments } = app.services;

  app.get(
    '/posts/:id/comments',
    {
      schema: {
        params: postIdParamsSchema,
        querystring: commentsQuerySchema,
        response: { 200: pageSchema(commentSchema) },
      },
    },
    async (request) => comments.list(request.params.id, request.query),
  );

  app.post(
    '/posts/:id/comments',
    {
      config: { auth: 'user' },
      schema: {
        params: postIdParamsSchema,
        body: createCommentSchema,
        response: { 201: commentSchema },
      },
    },
    async (request, reply) => {
      const comment = await comments.create(
        signedIn(request.auth).userId,
        request.params.id,
        request.body,
      );
      return reply.status(201).send(comment);
    },
  );

  app.delete(
    '/comments/:id',
    { config: { auth: 'user' }, schema: { params: commentIdParamsSchema } },
    async (request, reply) => {
      await comments.remove(signedIn(request.auth).userId, request.params.id);
      return reply.status(204).send();
    },
  );
};
