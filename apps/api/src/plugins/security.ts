import { getHeapStatistics } from 'node:v8';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import underPressure from '@fastify/under-pressure';
import fp from 'fastify-plugin';

/** Pipeline steps 1 and 2: security headers, CORS (staging only) and load shedding. */
export const securityPlugin = fp(
  async (app) => {
    await app.register(helmet, {
      // JSON API: nothing is rendered, so lock everything down.
      contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
      crossOriginResourcePolicy: { policy: 'same-origin' },
    });

    // Web traffic is same-origin through CloudFront, so production needs no CORS.
    if (app.env.CORS_ORIGINS.length > 0) {
      await app.register(cors, {
        origin: app.env.CORS_ORIGINS,
        credentials: false,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      });
    }

    await app.register(underPressure, {
      maxEventLoopDelay: 1_000,
      maxHeapUsedBytes: Math.floor(getHeapStatistics().heap_size_limit * 0.9),
      retryAfter: 10,
    });
  },
  { name: 'security', dependencies: ['env'] },
);
