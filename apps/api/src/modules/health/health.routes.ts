import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const CHECK_TIMEOUT_MS = 2_000;

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
  checks: z.object({ database: z.enum(['ok', 'fail']), valkey: z.enum(['ok', 'fail']) }),
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

  // Queue checks join here when BullMQ lands; the queues share Valkey today.
  app.get(
    '/ready',
    { config: { rateLimit: false }, schema: { response: { 200: readySchema, 503: readySchema } } },
    async (_request, reply) => {
      const [database, valkey] = await Promise.all([
        check(() => app.prisma.$queryRaw`SELECT 1`),
        check(() => app.valkey.ping()),
      ]);
      const ok = database === 'ok' && valkey === 'ok';
      return reply
        .status(ok ? 200 : 503)
        .send({ status: ok ? 'ok' : 'fail', checks: { database, valkey } });
    },
  );
};
