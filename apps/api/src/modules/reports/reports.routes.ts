import { createReportSchema, reportReceiptSchema } from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { signedIn } from '../businesses/businesses.routes';

export const reportsRoutes: FastifyPluginAsyncZod = async (app) => {
  const { reports } = app.services;

  app.post(
    '/reports',
    {
      config: { auth: 'user' },
      schema: {
        body: createReportSchema,
        response: { 200: reportReceiptSchema, 201: reportReceiptSchema },
      },
    },
    async (request, reply) => {
      const { receipt, isNew } = await reports.create(signedIn(request.auth).userId, request.body);
      return reply.status(isNew ? 201 : 200).send(receipt);
    },
  );
};
