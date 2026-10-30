import { randomUUID } from 'node:crypto';
import cookie from '@fastify/cookie';
import Fastify, { type FastifyServerOptions } from 'fastify';
import fp from 'fastify-plugin';
import {
  type ZodTypeProvider,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import type { Redis } from 'ioredis';
import type { Env } from './config/env';
import type { PrismaClient } from './generated/prisma/client';
import { healthRoutes } from './modules/health/health.routes';
import { authPlugin } from './plugins/auth';
import { csrfPlugin } from './plugins/csrf';
import { prismaPlugin, valkeyPlugin } from './plugins/data';
import { errorHandlerPlugin } from './plugins/error-handler';
import { rateLimitPlugin } from './plugins/rate-limit';
import { securityPlugin } from './plugins/security';

export interface BuildAppOptions {
  env: Env;
  /** Injected in tests; created from the env otherwise. */
  prisma?: PrismaClient;
  valkey?: Redis;
  logger?: FastifyServerOptions['logger'];
}

const SENSITIVE_FIELDS = [
  'password',
  'newPassword',
  'passwordHash',
  'otp',
  'token',
  'accessToken',
  'refreshToken',
  'csrfToken',
  'phone',
  'email',
  'identifier',
  'accountNumber',
  'ifsc',
  'upiId',
  'vpa',
];

/** Backend spec, Data protection: logs never carry credentials, tokens, OTPs, contact or payout details. */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-csrf-token"]',
  'res.headers["set-cookie"]',
  ...SENSITIVE_FIELDS.flatMap((field) => [field, `*.${field}`, `*.*.${field}`]),
];

export async function buildApp(options: BuildAppOptions) {
  const { env } = options;
  const app = Fastify({
    logger: options.logger ?? {
      level: env.LOG_LEVEL,
      redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
    },
    // Trust exactly TRUST_PROXY hops (CloudFront, Caddy) when reading X-Forwarded-For.
    trustProxy: (_address, hop) => hop < env.TRUST_PROXY,
    bodyLimit: 1024 * 1024,
    // Never trust a client-supplied request id.
    requestIdHeader: false,
    genReqId: () => randomUUID(),
    requestIdLogLabel: 'requestId',
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.addHook('onRequest', async (request, reply) => {
    reply.header('x-request-id', request.id);
  });

  await app.register(
    fp(
      async (instance) => {
        instance.decorate('env', env);
      },
      { name: 'env' },
    ),
  );
  await app.register(errorHandlerPlugin);
  await app.register(prismaPlugin, options.prisma ? { prisma: options.prisma } : {});
  await app.register(valkeyPlugin, options.valkey ? { valkey: options.valkey } : {});
  await app.register(cookie);

  // Request pipeline, in the backend spec's order: helmet and under-pressure
  // (onRequest), rate limit (route onRequest), auth then CSRF (preParsing),
  // Zod validation, handler, Zod response serialization, problem details.
  await app.register(securityPlugin);
  await app.register(authPlugin);
  await app.register(rateLimitPlugin);
  await app.register(csrfPlugin);

  await app.register(healthRoutes);
  // Feature modules register under /v1 as they land.

  return app;
}

export type App = Awaited<ReturnType<typeof buildApp>>;
