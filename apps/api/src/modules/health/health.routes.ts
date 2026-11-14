import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { QUEUE } from '../../jobs/worker';

const CHECK_TIMEOUT_MS = 2_000;
/** Waiting jobs across the queues above which the backlog alarm is raised (backend spec, Observability). */
export const QUEUE_BACKLOG_LIMIT = 5_000;

async function check(probe: () => Promise<unknown>): Promise<'ok' | 'fail'> {
  try {
    await Promise.race([
      probe(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), CHECK_TIMEOUT_MS)),
    ]);
    return 'ok';
  } catch {
    return 'fail';
  }
}

const readySchema = z.object({
  status: z.enum(['ok', 'fail']),
  checks: z.object({
    database: z.enum(['ok', 'fail']),
    valkey: z.enum(['ok', 'fail']),
    queue: z.enum(['ok', 'fail']),
  }),
});

/** Liveness and readiness for the load balancer and CloudWatch. Outside /v1 and not rate limited. */
export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/health',
    {
      config: { rateLimit: false },
      schema: { response: { 200: z.object({ status: z.literal('ok') }) } },
    },
    async () => ({ status: 'ok' as const }),
  );

  app.get(
    '/ready',
    { config: { rateLimit: false }, schema: { response: { 200: readySchema, 503: readySchema } } },
    async (_request, reply) => {
      const [database, valkey, queue] = await Promise.all([
        check(() => app.prisma.$queryRaw`SELECT 1`),
        check(() => app.valkey.ping()),
        check(async () => {
          // BullMQ keeps each queue's waiting jobs in a Valkey list; a worker that has stopped shows
          // up as a growing backlog. Counted without importing BullMQ into the API process.
          const lengths = await Promise.all(
            Object.values(QUEUE).map((name) => app.valkey.llen(`bull:${name}:wait`)),
          );
          if (lengths.reduce((sum, length) => sum + length, 0) > QUEUE_BACKLOG_LIMIT) {
            throw new Error('queue backlog');
          }
        }),
      ]);
      const ok = database === 'ok' && valkey === 'ok' && queue === 'ok';
      return reply
        .status(ok ? 200 : 503)
        .send({ status: ok ? 'ok' : 'fail', checks: { database, valkey, queue } });
    },
  );
};
