import pino from 'pino';
import { REDACT_PATHS } from './app';
import { loadEnv } from './config/env';
import { startNotificationWorker } from './jobs/worker';
import { HttpExpoPushClient } from './modules/notifications/channels/expo';
import {
  ConsoleEmailSender,
  type EmailSender,
  SesEmailSender,
} from './modules/notifications/channels/email';
import { VapidWebPushSender } from './modules/notifications/channels/web-push';
import { createPrisma, createValkey } from './plugins/data';

// The BullMQ worker: same image as the API, started with `node dist/worker.js` (backend spec,
// Architecture). Scale it separately from the API.
const env = loadEnv();
const log = pino({ level: env.LOG_LEVEL, redact: { paths: REDACT_PATHS, censor: '[REDACTED]' } });
const prisma = createPrisma(env.DATABASE_URL);
const valkey = createValkey(env.VALKEY_URL);

const email: EmailSender =
  env.EMAIL_PROVIDER === 'ses' && env.EMAIL_FROM
    ? new SesEmailSender(env.SES_REGION, env.EMAIL_FROM)
    : new ConsoleEmailSender();
const webPush =
  env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT
    ? new VapidWebPushSender({
        subject: env.VAPID_SUBJECT,
        publicKey: env.VAPID_PUBLIC_KEY,
        privateKey: env.VAPID_PRIVATE_KEY,
      })
    : null;

const worker = await startNotificationWorker({
  env,
  prisma,
  valkey,
  expo: new HttpExpoPushClient(env.EXPO_ACCESS_TOKEN),
  webPush,
  email,
  log,
});
log.info({ webPush: Boolean(webPush), email: env.EMAIL_PROVIDER }, 'worker started');

const shutdown = async (signal: string) => {
  log.info({ signal }, 'worker shutting down');
  await worker.close();
  await Promise.all([prisma.$disconnect(), valkey.quit()]);
  process.exit(0);
};
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
