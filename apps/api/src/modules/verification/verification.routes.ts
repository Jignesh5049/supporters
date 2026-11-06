import { myVerificationSchema, submitVerificationSchema } from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { signedIn } from '../businesses/businesses.routes';

export const verificationRoutes: FastifyPluginAsyncZod = async (app) => {
  const { verification } = app.services;

  app.get(
    '/me/business/verification',
    { config: { auth: 'user' }, schema: { response: { 200: myVerificationSchema } } },
    async (request) => verification.getMine(signedIn(request.auth).userId),
  );

  app.post(
    '/me/business/verification',
    {
      config: { auth: 'user' },
      schema: { body: submitVerificationSchema, response: { 201: myVerificationSchema } },
    },
    async (request, reply) => {
      const result = await verification.submit(signedIn(request.auth).userId, request.body);
      return reply.status(201).send(result);
    },
  );
};
