import {
  ledgerEntrySchema,
  pageSchema,
  paginationQuerySchema,
  referralsResponseSchema,
  walletSchema,
} from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { signedIn } from '../businesses/businesses.routes';

/** `GET /me/referrals`, `GET /me/wallet`, `GET /me/wallet/ledger`. Own data only: the user id comes from the token. */
export const walletRoutes: FastifyPluginAsyncZod = async (app) => {
  const { referrals, wallet } = app.services;
  const noStore = (reply: { header: (name: string, value: string) => unknown }) =>
    reply.header('cache-control', 'no-store');

  app.get(
    '/me/referrals',
    {
      config: { auth: 'user' },
      schema: { querystring: paginationQuerySchema, response: { 200: referralsResponseSchema } },
    },
    async (request, reply) => {
      noStore(reply);
      return referrals.overview(signedIn(request.auth).userId, request.query);
    },
  );

  app.get(
    '/me/wallet',
    { config: { auth: 'user' }, schema: { response: { 200: walletSchema } } },
    async (request, reply) => {
      noStore(reply);
      return wallet.get(signedIn(request.auth).userId);
    },
  );

  app.get(
    '/me/wallet/ledger',
    {
      config: { auth: 'user' },
      schema: {
        querystring: paginationQuerySchema,
        response: { 200: pageSchema(ledgerEntrySchema) },
      },
    },
    async (request, reply) => {
      noStore(reply);
      return wallet.ledger(signedIn(request.auth).userId, request.query);
    },
  );
};
