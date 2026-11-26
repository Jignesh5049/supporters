import { presignUploadSchema, presignedUploadSchema, uploadSchema } from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { signedIn } from '../businesses/businesses.routes';

export const uploadsRoutes: FastifyPluginAsyncZod = async (app) => {
  const { uploads } = app.services;

  app.post(
    '/uploads/presign',
    {
      config: { auth: 'user' },
      schema: { body: presignUploadSchema, response: { 201: presignedUploadSchema } },
    },
    async (request, reply) => {
      const presigned = await uploads.presign(signedIn(request.auth).userId, request.body);
      return reply.status(201).send(presigned);
    },
  );

  app.post(
    '/uploads/:id/complete',
    {
      config: { auth: 'user' },
      schema: { params: z.strictObject({ id: z.uuid() }), response: { 200: uploadSchema } },
    },
    async (request) => uploads.complete(signedIn(request.auth).userId, request.params.id),
  );

  // Clients poll this while an upload is `processing`.
  app.get(
    '/uploads/:id',
    {
      config: { auth: 'user' },
      schema: { params: z.strictObject({ id: z.uuid() }), response: { 200: uploadSchema } },
    },
    async (request) => uploads.get(signedIn(request.auth).userId, request.params.id),
  );
};
