import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const headersSchema = z.looseObject({
  'x-razorpay-signature': z.string().min(1).max(256),
  'x-razorpay-event-id': z.string().min(1).max(128),
});

const bodySchema = z.instanceof(Buffer);

/**
 * `POST /v1/webhooks/razorpayx`. The signature covers the raw bytes, so this plugin keeps the body
 * as a Buffer instead of parsing it; the parser lives in this encapsulated scope only, and every
 * other route still gets parsed JSON. No cookie or token: the HMAC is the credential.
 */
export const razorpayxWebhookRoutes: FastifyPluginAsyncZod = async (app) => {
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_request, body, done) => {
    done(null, body);
  });

  app.post(
    '/webhooks/razorpayx',
    {
      schema: {
        headers: headersSchema,
        body: bodySchema,
        response: { 200: z.object({ status: z.enum(['ok', 'duplicate', 'ignored']) }) },
      },
    },
    async (request) => ({
      status: await app.services.razorpayxWebhooks.handle({
        rawBody: request.body,
        signature: request.headers['x-razorpay-signature'],
        eventId: request.headers['x-razorpay-event-id'],
      }),
    }),
  );
};
