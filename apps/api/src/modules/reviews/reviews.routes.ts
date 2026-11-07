import {
  createReviewSchema,
  myReviewSchema,
  reviewIdParamsSchema,
  reviewReplySchema,
  reviewSchema,
  reviewsPageSchema,
  reviewsQuerySchema,
  updateReviewSchema,
} from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { signedIn } from '../businesses/businesses.routes';

const businessParamsSchema = z.strictObject({ id: z.uuid() });
const noContent = { 204: z.null() };

/** Reviews (backend spec, Endpoint map: Reviews). */
export const reviewsRoutes: FastifyPluginAsyncZod = async (app) => {
  const { reviews } = app.services;

  /** Public; a signed-in viewer sees `isMine` on their own review. */
  app.get(
    '/businesses/:id/reviews',
    {
      schema: {
        params: businessParamsSchema,
        querystring: reviewsQuerySchema,
        response: { 200: reviewsPageSchema },
      },
    },
    async (request) => reviews.list(request.auth?.userId ?? null, request.params.id, request.query),
  );

  /** The viewer's review of the business and whether they may write one. */
  app.get(
    '/businesses/:id/reviews/mine',
    {
      config: { auth: 'user' },
      schema: { params: businessParamsSchema, response: { 200: myReviewSchema } },
    },
    async (request) => reviews.mine(signedIn(request.auth).userId, request.params.id),
  );

  app.post(
    '/businesses/:id/reviews',
    {
      config: { auth: 'user' },
      schema: {
        params: businessParamsSchema,
        body: createReviewSchema,
        response: { 201: reviewSchema },
      },
    },
    async (request, reply) => {
      const review = await reviews.create(
        signedIn(request.auth).userId,
        request.params.id,
        request.body,
      );
      return reply.status(201).send(review);
    },
  );

  app.patch(
    '/reviews/:id',
    {
      config: { auth: 'user' },
      schema: {
        params: reviewIdParamsSchema,
        body: updateReviewSchema,
        response: { 200: reviewSchema },
      },
    },
    async (request) =>
      reviews.update(signedIn(request.auth).userId, request.params.id, request.body),
  );

  app.delete(
    '/reviews/:id',
    {
      config: { auth: 'user' },
      schema: { params: reviewIdParamsSchema, response: noContent },
    },
    async (request, reply) => {
      await reviews.remove(signedIn(request.auth).userId, request.params.id);
      return reply.status(204).send(null);
    },
  );

  /** The business owner's one public reply; PUT again to edit it. */
  app.put(
    '/reviews/:id/reply',
    {
      config: { auth: 'user' },
      schema: {
        params: reviewIdParamsSchema,
        body: reviewReplySchema,
        response: { 200: reviewSchema },
      },
    },
    async (request) =>
      reviews.reply(signedIn(request.auth).userId, request.params.id, request.body.body),
  );

  app.delete(
    '/reviews/:id/reply',
    {
      config: { auth: 'user' },
      schema: { params: reviewIdParamsSchema, response: noContent },
    },
    async (request, reply) => {
      await reviews.removeReply(signedIn(request.auth).userId, request.params.id);
      return reply.status(204).send(null);
    },
  );
};
