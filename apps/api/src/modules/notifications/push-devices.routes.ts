import {
  deletePushTokenSchema,
  deleteWebPushSubscriptionSchema,
  registerPushTokenSchema,
  vapidPublicKeySchema,
  webPushSubscriptionSchema,
} from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { signedIn } from '../businesses/businesses.routes';

const noContent = { 204: z.null() };

export const pushDevicesRoutes: FastifyPluginAsyncZod = async (app) => {
  const { pushDevices } = app.services;

  app.post(
    '/me/push-tokens',
    { config: { auth: 'user' }, schema: { body: registerPushTokenSchema, response: noContent } },
    async (request, reply) => {
      const { userId, sessionId } = signedIn(request.auth);
      await pushDevices.registerToken(userId, sessionId, request.body);
      return reply.status(204).send(null);
    },
  );

  app.delete(
    '/me/push-tokens',
    { config: { auth: 'user' }, schema: { body: deletePushTokenSchema, response: noContent } },
    async (request, reply) => {
      await pushDevices.deleteToken(signedIn(request.auth).userId, request.body.token);
      return reply.status(204).send(null);
    },
  );

  app.post(
    '/me/web-push-subscriptions',
    {
      config: { auth: 'user' },
      schema: { body: webPushSubscriptionSchema, response: noContent },
    },
    async (request, reply) => {
      const { userId, sessionId } = signedIn(request.auth);
      await pushDevices.subscribeWeb(userId, sessionId, request.body);
      return reply.status(204).send(null);
    },
  );

  app.delete(
    '/me/web-push-subscriptions',
    {
      config: { auth: 'user' },
      schema: { body: deleteWebPushSubscriptionSchema, response: noContent },
    },
    async (request, reply) => {
      await pushDevices.unsubscribeWeb(signedIn(request.auth).userId, request.body.endpoint);
      return reply.status(204).send(null);
    },
  );

  // Public: the application server key is meant to be shared with every browser.
  app.get(
    '/notifications/vapid-public-key',
    { schema: { response: { 200: vapidPublicKeySchema } } },
    async () => ({ publicKey: app.env.VAPID_PUBLIC_KEY ?? null }),
  );
};
