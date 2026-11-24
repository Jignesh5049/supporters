import {
  adminIdParamsSchema,
  adminPaymentSchema,
  adminPaymentsQuerySchema,
  idempotencyKeyHeaderSchema,
  invoiceDetailSchema,
  invoiceIdParamsSchema,
  invoicesPageSchema,
  keepListingsSchema,
  pageSchema,
  paginationQuerySchema,
  premiumCheckoutResultSchema,
  premiumCheckoutSchema,
  premiumListingsSchema,
  premiumStatusSchema,
  refundPaymentSchema,
} from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { AppError, ErrorCode, notFound } from '../../lib/errors';
import { adminActor } from '../admin/audit.service';
import { signedIn } from '../businesses/businesses.routes';
import { chargedEvent } from './fake-razorpay';
import { FakeRazorpay } from './fake-razorpay';

/**
 * Premium (backend spec, Endpoint map: Premium). Premium is sold on the web only, so checkout
 * refuses `X-Client: mobile`. Status and invoices are read from the database.
 */
export const premiumRoutes: FastifyPluginAsyncZod = async (app) => {
  const { premium, invoices, businesses } = app.services;

  app.get(
    '/me/business/premium',
    { config: { auth: 'user' }, schema: { response: { 200: premiumStatusSchema } } },
    async (request) => premium.status(signedIn(request.auth).userId),
  );

  app.post(
    '/me/business/premium/checkout',
    {
      config: { auth: 'user' },
      // Before validation, so a mobile client gets the real reason, not a missing-header error.
      preValidation: async (request) => {
        if (request.headers['x-client'] === 'mobile') {
          throw new AppError(403, ErrorCode.PremiumWebOnly, 'Premium is bought on the web', {
            detail: 'Open Supporters in a browser to buy Premium.',
          });
        }
      },
      schema: {
        headers: idempotencyKeyHeaderSchema,
        body: premiumCheckoutSchema,
        response: { 200: premiumCheckoutResultSchema, 201: premiumCheckoutResultSchema },
      },
    },
    async (request, reply) => {
      const { result, isReplay } = await premium.checkout(
        signedIn(request.auth).userId,
        request.body,
        request.headers['idempotency-key'],
      );
      return reply.status(isReplay ? 200 : 201).send(result);
    },
  );

  app.post(
    '/me/business/premium/cancel',
    { config: { auth: 'user' }, schema: { response: { 200: premiumStatusSchema } } },
    async (request) => premium.cancel(signedIn(request.auth).userId),
  );

  app.get(
    '/me/business/premium/listings',
    { config: { auth: 'user' }, schema: { response: { 200: premiumListingsSchema } } },
    async (request) => premium.listings(signedIn(request.auth).userId),
  );

  app.put(
    '/me/business/premium/listings',
    {
      config: { auth: 'user' },
      schema: { body: keepListingsSchema, response: { 200: premiumListingsSchema } },
    },
    async (request) => premium.keepListings(signedIn(request.auth).userId, request.body),
  );

  app.get(
    '/me/business/invoices',
    {
      config: { auth: 'user' },
      schema: { querystring: paginationQuerySchema, response: { 200: invoicesPageSchema } },
    },
    async (request) => {
      const business = await businesses.requireOwned(signedIn(request.auth).userId);
      return invoices.list(business.id, request.query);
    },
  );

  app.get(
    '/me/business/invoices/:id',
    {
      config: { auth: 'user' },
      schema: { params: invoiceIdParamsSchema, response: { 200: invoiceDetailSchema } },
    },
    async (request) => {
      // Scoped to the caller's own business: another user's invoice id is a 404.
      const business = await businesses.requireOwned(signedIn(request.auth).userId);
      return invoices.get(business.id, request.params.id);
    },
  );
};

/** `/v1/admin/payments*`: registered inside the admin plugin, so it inherits the admin guard. */
export const adminPaymentsRoutes: FastifyPluginAsyncZod = async (app) => {
  const { premium } = app.services;

  app.get(
    '/payments',
    {
      schema: {
        querystring: adminPaymentsQuerySchema,
        response: { 200: pageSchema(adminPaymentSchema) },
      },
    },
    async (request) => premium.adminPayments(request.query),
  );

  app.post(
    '/payments/:id/refund',
    {
      schema: {
        params: adminIdParamsSchema,
        body: refundPaymentSchema,
        response: { 200: adminPaymentSchema },
      },
    },
    async (request) => premium.refund(adminActor(request), request.params.id, request.body.reason),
  );
};

/**
 * Development only (`PAYMENTS_PROVIDER=fake`, refused in staging and production): stands in for the
 * Razorpay Checkout popup. It "pays" the caller's pending subscription by delivering a signed
 * `subscription.charged` webhook through the real webhook path, then applies it at once, so a local
 * stack works without a worker. Never registered with another provider.
 */
export const fakeCheckoutRoutes: FastifyPluginAsyncZod = async (app) => {
  const { webhooks, payments, premium } = app.services;
  const secret = app.env.RAZORPAY_WEBHOOK_SECRET;

  app.post(
    '/dev/payments/fake/complete',
    {
      config: { auth: 'user' },
      schema: {
        body: z.strictObject({ subscriptionId: z.uuid() }),
        response: { 200: premiumStatusSchema },
      },
    },
    async (request) => {
      const { userId } = signedIn(request.auth);
      const provider = payments.provider;
      if (!(provider instanceof FakeRazorpay) || !secret) throw notFound();
      const sub = await app.prisma.subscription.findFirst({
        where: { id: request.body.subscriptionId, createdByUserId: userId, status: 'created' },
      });
      if (!sub) throw notFound();
      const paymentId = `pay_fake${sub.id.replaceAll('-', '').slice(0, 14)}`;
      provider.payments.set(paymentId, sub.providerSubscriptionId);
      const start = new Date();
      const delivery = chargedEvent(secret, {
        providerSubscriptionId: sub.providerSubscriptionId,
        providerPaymentId: paymentId,
        amountPaise: Number(sub.amountPaise),
        periodStart: start,
        periodEnd: new Date(start.getTime() + 365 * 86_400_000),
      });
      const result = await webhooks.receive(Buffer.from(delivery.body), {
        signature: delivery.signature,
        eventId: delivery.eventId,
      });
      if (result.outcome === 'accepted') await payments.processor.process(result.webhookEventId);
      return premium.status(userId);
    },
  );
};
