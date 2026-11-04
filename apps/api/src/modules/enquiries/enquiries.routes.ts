import {
  businessEnquiriesQuerySchema,
  createEnquirySchema,
  enquiryIdParamsSchema,
  enquirySchema,
  idempotencyKeyHeaderSchema,
  pageSchema,
  paginationQuerySchema,
  responseStatsSchema,
  updateEnquirySchema,
} from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { signedIn } from '../businesses/businesses.routes';

export const enquiriesRoutes: FastifyPluginAsyncZod = async (app) => {
  const { enquiries } = app.services;

  app.post(
    '/enquiries',
    {
      config: { auth: 'user' },
      schema: {
        headers: idempotencyKeyHeaderSchema,
        body: createEnquirySchema,
        response: { 200: enquirySchema, 201: enquirySchema },
      },
    },
    async (request, reply) => {
      const { enquiry, replayed } = await enquiries.create(
        signedIn(request.auth).userId,
        request.headers['idempotency-key'],
        request.body,
      );
      return reply.status(replayed ? 200 : 201).send(enquiry);
    },
  );

  app.get(
    '/me/enquiries',
    {
      config: { auth: 'user' },
      schema: {
        querystring: paginationQuerySchema,
        response: { 200: pageSchema(enquirySchema) },
      },
    },
    async (request) => enquiries.listMine(signedIn(request.auth).userId, request.query),
  );

  app.get(
    '/me/business/enquiries',
    {
      config: { auth: 'user' },
      schema: {
        querystring: businessEnquiriesQuerySchema,
        response: { 200: pageSchema(enquirySchema) },
      },
    },
    async (request) => enquiries.listForBusiness(signedIn(request.auth).userId, request.query),
  );

  app.patch(
    '/me/business/enquiries/:id',
    {
      config: { auth: 'user' },
      schema: {
        params: enquiryIdParamsSchema,
        body: updateEnquirySchema,
        response: { 200: enquirySchema },
      },
    },
    async (request) => enquiries.close(signedIn(request.auth).userId, request.params.id),
  );

  /** Public: shown on the business page once it has 5 enquiries in the last 90 days. */
  app.get(
    '/businesses/:id/response-stats',
    {
      schema: {
        params: z.strictObject({ id: z.uuid() }),
        response: { 200: responseStatsSchema },
      },
    },
    async (request) => enquiries.responseStats(request.params.id),
  );
};
