import {
  markNotificationsReadSchema,
  notificationPrefsSchema,
  notificationsPageSchema,
  notificationsQuerySchema,
  unreadCountSchema,
  updateNotificationPrefsSchema,
} from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { signedIn } from '../businesses/businesses.routes';

export const notificationsRoutes: FastifyPluginAsyncZod = async (app) => {
  const { notifications } = app.services;

  app.get(
    '/notifications',
    {
      config: { auth: 'user' },
      schema: {
        querystring: notificationsQuerySchema,
        response: { 200: notificationsPageSchema },
      },
    },
    async (request) => notifications.list(signedIn(request.auth).userId, request.query),
  );

  app.post(
    '/notifications/read',
    {
      config: { auth: 'user' },
      schema: { body: markNotificationsReadSchema, response: { 200: unreadCountSchema } },
    },
    async (request) => ({
      unreadCount: await notifications.markRead(signedIn(request.auth).userId, request.body),
    }),
  );

  app.get(
    '/me/notification-prefs',
    { config: { auth: 'user' }, schema: { response: { 200: notificationPrefsSchema } } },
    async (request) => notifications.getPrefs(signedIn(request.auth).userId),
  );

  app.put(
    '/me/notification-prefs',
    {
      config: { auth: 'user' },
      schema: { body: updateNotificationPrefsSchema, response: { 200: notificationPrefsSchema } },
    },
    async (request) => notifications.updatePrefs(signedIn(request.auth).userId, request.body),
  );
};
