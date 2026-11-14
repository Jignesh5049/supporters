import * as Sentry from '@sentry/node';
import { buildApp } from './app';
import { loadEnv } from './config/env';

// Socket.IO attaches here when realtime chat lands (Phase 3).
const env = loadEnv();
const app = await buildApp({ env });
// Sentry starts in src/instrument.ts (preloaded with --import); its Fastify integration reports
// route errors on its own. No DSN, no-op.

const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  await app.close();
  await Sentry.close(2000);
  process.exit(0);
};
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));

await app.listen({ host: env.HOST, port: env.PORT });
