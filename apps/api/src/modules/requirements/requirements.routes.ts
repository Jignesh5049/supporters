import {
  createQuoteSchema,
  createRequirementSchema,
  idempotencyKeyHeaderSchema,
  myRequirementsQuerySchema,
  pageSchema,
  paginationQuerySchema,
  quoteSchema,
  requirementIdParamsSchema,
  requirementSchema,
  updateRequirementSchema,
} from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { signedIn } from '../businesses/businesses.routes';

/** Buyer requirements (backend spec, Endpoint map: Requirements). Every route needs a session. */
export const requirementsRoutes: FastifyPluginAsyncZod = async (app) => {
  const { requirements } = app.services;

  /** Open requirements matched to the signed-in user's business; 403 without a business. */
  app.get(
    '/buyer-requirements',
    {
      config: { auth: 'user' },
      schema: {
        querystring: paginationQuerySchema,
        response: { 200: pageSchema(requirementSchema) },
      },
    },
    async (request) => requirements.listMatched(signedIn(request.auth).userId, request.query),
  );

  app.post(
    '/buyer-requirements',
    {
      config: { auth: 'user' },
      schema: { body: createRequirementSchema, response: { 201: requirementSchema } },
    },
    async (request, reply) => {
      const requirement = await requirements.create(signedIn(request.auth).userId, request.body);
      return reply.status(201).send(requirement);
    },
  );

  app.get(
    '/me/buyer-requirements',
    {
      config: { auth: 'user' },
      schema: {
        querystring: myRequirementsQuerySchema,
        response: { 200: pageSchema(requirementSchema) },
      },
    },
    async (request) => requirements.listMine(signedIn(request.auth).userId, request.query),
  );

  /** The buyer, or a business it was matched to. */
  app.get(
    '/buyer-requirements/:id',
    {
      config: { auth: 'user' },
      schema: { params: requirementIdParamsSchema, response: { 200: requirementSchema } },
    },
    async (request) => requirements.get(signedIn(request.auth).userId, request.params.id),
  );

  /** The buyer closes it early or marks it fulfilled. */
  app.patch(
    '/buyer-requirements/:id',
    {
      config: { auth: 'user' },
      schema: {
        params: requirementIdParamsSchema,
        body: updateRequirementSchema,
        response: { 200: requirementSchema },
      },
    },
    async (request) =>
      requirements.update(signedIn(request.auth).userId, request.params.id, request.body.status),
  );

  /** The buyer's view of the quotes on their requirement. */
  app.get(
    '/buyer-requirements/:id/quotes',
    {
      config: { auth: 'user' },
      schema: {
        params: requirementIdParamsSchema,
        querystring: paginationQuerySchema,
        response: { 200: pageSchema(quoteSchema) },
      },
    },
    async (request) =>
      requirements.listQuotes(signedIn(request.auth).userId, request.params.id, request.query),
  );

  /** Needs an Idempotency-Key (a UUID); a retry answers 200 with the stored quote. */
  app.post(
    '/buyer-requirements/:id/quotes',
    {
      config: { auth: 'user' },
      schema: {
        params: requirementIdParamsSchema,
        headers: idempotencyKeyHeaderSchema,
        body: createQuoteSchema,
        response: { 200: quoteSchema, 201: quoteSchema },
      },
    },
    async (request, reply) => {
      const { quote, replayed } = await requirements.quote(
        signedIn(request.auth).userId,
        request.params.id,
        request.headers['idempotency-key'],
        request.body,
      );
      return reply.status(replayed ? 200 : 201).send(quote);
    },
  );
};
