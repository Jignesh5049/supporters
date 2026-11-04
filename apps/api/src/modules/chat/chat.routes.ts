import {
  attachmentParamsSchema,
  conversationIdParamsSchema,
  conversationSchema,
  conversationsQuerySchema,
  idempotencyKeyHeaderSchema,
  markReadSchema,
  messageIdParamsSchema,
  messageSchema,
  messagesQuerySchema,
  openConversationSchema,
  pageSchema,
  readStateSchema,
  sendMessageSchema,
  updateConversationSchema,
} from '@supporters/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { signedIn } from '../businesses/businesses.routes';

export const chatRoutes: FastifyPluginAsyncZod = async (app) => {
  const { chat } = app.services;

  app.get(
    '/conversations',
    {
      config: { auth: 'user' },
      schema: {
        querystring: conversationsQuerySchema,
        response: { 200: pageSchema(conversationSchema) },
      },
    },
    async (request) => chat.list(signedIn(request.auth).userId, request.query),
  );

  app.post(
    '/conversations',
    {
      config: { auth: 'user' },
      schema: {
        body: openConversationSchema,
        response: { 200: conversationSchema, 201: conversationSchema },
      },
    },
    async (request, reply) => {
      const { conversation, created } = await chat.open(
        signedIn(request.auth).userId,
        request.body.businessId,
      );
      return reply.status(created ? 201 : 200).send(conversation);
    },
  );

  app.patch(
    '/conversations/:id',
    {
      config: { auth: 'user' },
      schema: {
        params: conversationIdParamsSchema,
        body: updateConversationSchema,
        response: { 200: conversationSchema },
      },
    },
    async (request) =>
      chat.updateState(signedIn(request.auth).userId, request.params.id, request.body),
  );

  app.get(
    '/conversations/:id/messages',
    {
      config: { auth: 'user' },
      schema: {
        params: conversationIdParamsSchema,
        querystring: messagesQuerySchema,
        response: { 200: pageSchema(messageSchema) },
      },
    },
    async (request) =>
      chat.listMessages(signedIn(request.auth).userId, request.params.id, request.query),
  );

  /** REST fallback for the socket. The Idempotency-Key is the message's clientId. */
  app.post(
    '/conversations/:id/messages',
    {
      config: { auth: 'user' },
      schema: {
        params: conversationIdParamsSchema,
        headers: idempotencyKeyHeaderSchema,
        body: sendMessageSchema,
        response: { 200: messageSchema, 201: messageSchema },
      },
    },
    async (request, reply) => {
      const result = await chat.send(
        signedIn(request.auth).userId,
        request.params.id,
        request.headers['idempotency-key'],
        request.body,
      );
      return reply.status(result.replayed ? 200 : 201).send(result.message);
    },
  );

  app.post(
    '/conversations/:id/read',
    {
      config: { auth: 'user' },
      schema: {
        params: conversationIdParamsSchema,
        body: markReadSchema,
        response: { 200: readStateSchema },
      },
    },
    async (request) =>
      chat.markRead(signedIn(request.auth).userId, request.params.id, request.body.messageId),
  );

  app.delete(
    '/messages/:id',
    {
      config: { auth: 'user' },
      schema: { params: messageIdParamsSchema },
    },
    async (request, reply) => {
      await chat.deleteForMe(signedIn(request.auth).userId, request.params.id);
      return reply.status(204).send();
    },
  );

  /** Chat files are private: members get a redirect to a 5-minute signed URL, never a public one. */
  app.get(
    '/attachments/:id',
    {
      config: { auth: 'user' },
      schema: { params: attachmentParamsSchema },
    },
    async (request, reply) => {
      const url = await chat.attachmentUrl(signedIn(request.auth).userId, request.params.id);
      return reply.header('cache-control', 'private, no-store').redirect(url, 302);
    },
  );
};
