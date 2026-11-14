import {
  createWithdrawalSchema,
  idempotencyKeyHeaderSchema,
  pageSchema,
  paginationQuerySchema,
  payoutAccountResponseSchema,
  putPayoutAccountSchema,
  withdrawalSchema,
} from '@supporters/shared';
import type { FastifyRequest } from 'fastify';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { signedIn } from '../businesses/businesses.routes';

const audit = (request: FastifyRequest) => ({
  ip: request.ip,
  userAgent: request.headers['user-agent']?.slice(0, 512) ?? null,
});

/**
 * `/me/payout-account` and `/me/withdrawals`. Everything is scoped by the user id from the token;
 * no route takes a user or account id, so there is no other user's object to reach. Responses are
 * never cached.
 */
export const payoutsRoutes: FastifyPluginAsyncZod = async (app) => {
  const { payoutAccounts, withdrawals } = app.services;

  app.get(
    '/me/payout-account',
    { config: { auth: 'user' }, schema: { response: { 200: payoutAccountResponseSchema } } },
    async (request, reply) => {
      reply.header('cache-control', 'no-store');
      return { account: await payoutAccounts.get(signedIn(request.auth).userId) };
    },
  );

  app.put(
    '/me/payout-account',
    {
      config: { auth: 'user' },
      schema: { body: putPayoutAccountSchema, response: { 200: payoutAccountResponseSchema } },
    },
    async (request, reply) => {
      reply.header('cache-control', 'no-store');
      const account = await payoutAccounts.put(
        signedIn(request.auth).userId,
        request.body,
        audit(request),
      );
      return { account };
    },
  );

  app.post(
    '/me/withdrawals',
    {
      config: { auth: 'user' },
      schema: {
        headers: idempotencyKeyHeaderSchema,
        body: createWithdrawalSchema,
        response: { 200: withdrawalSchema, 201: withdrawalSchema },
      },
    },
    async (request, reply) => {
      reply.header('cache-control', 'no-store');
      const { withdrawal, replayed } = await withdrawals.create(
        signedIn(request.auth).userId,
        request.headers['idempotency-key'],
        request.body,
        audit(request),
      );
      return reply.status(replayed ? 200 : 201).send(withdrawal);
    },
  );

  app.get(
    '/me/withdrawals',
    {
      config: { auth: 'user' },
      schema: {
        querystring: paginationQuerySchema,
        response: { 200: pageSchema(withdrawalSchema) },
      },
    },
    async (request, reply) => {
      reply.header('cache-control', 'no-store');
      return withdrawals.list(signedIn(request.auth).userId, request.query);
    },
  );
};
