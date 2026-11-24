import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

/**
 * `POST /v1/webhooks/razorpay`. Its own encapsulated scope so the JSON body stays a raw Buffer:
 * the signature is over the exact bytes Razorpay sent, and a parsed-then-reserialised body would
 * not verify (or, worse, would verify something else).
 */
export const webhookRoutes: FastifyPluginAsyncZod = async (app) => {
  const { webhooks } = app.services;

  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (_request, body, done) => {
    done(null, body);
  });

  app.post(
    '/webhooks/razorpay',
    {
      // Authenticated by signature, not by session. Renewals arrive in bursts, so a wider budget.
      config: { rateLimit: { max: 1_200, timeWindow: 60_000 } },
      schema: { response: { 200: z.object({ received: z.literal(true) }) } },
    },
    async (request) => {
      const signature = request.headers['x-razorpay-signature'];
      const eventId = request.headers['x-razorpay-event-id'];
      await webhooks.receive(request.body as Buffer, {
        signature: typeof signature === 'string' ? signature : undefined,
        eventId: typeof eventId === 'string' ? eventId : undefined,
      });
      // Accepted, duplicate or ignored: the sender gets the same fast 200.
      return { received: true as const };
    },
  );
};
