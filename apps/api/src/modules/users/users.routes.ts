import { meSchema } from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { unauthenticated } from '../../lib/errors';

export const usersRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/me',
    { config: { auth: 'user' }, schema: { response: { 200: meSchema } } },
    async (request) => {
      const me = request.auth ? await app.services.users.getMe(request.auth.userId) : null;
      if (!me) throw unauthenticated();
      return me;
    },
  );
};
