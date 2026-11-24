import * as Sentry from '@sentry/node';
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
import { PayoutProcessor } from './modules/payouts/payout-processor';
import { createPayoutsRuntime } from './modules/payouts/payouts.config';
import { ReferralsService } from './modules/referrals/referrals.service';
import { createMeili } from './modules/search/meili';
import { SearchIndexer } from './modules/search/search.indexer';
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

if (!env.MEILI_INDEX_KEY) {
  // Without it, search-index jobs pile up and search goes stale.
  throw new Error('Invalid environment: MEILI_INDEX_KEY is required by the worker');
}
const searchIndexer = new SearchIndexer(prisma, createMeili(env.MEILI_URL, env.MEILI_INDEX_KEY));

const payoutsRuntime = createPayoutsRuntime(env);

const worker = await startNotificationWorker({
  env,
  prisma,
  valkey,
  expo: new HttpExpoPushClient(env.EXPO_ACCESS_TOKEN),
  webPush,
  email,
  searchIndexer,
  referrals: new ReferralsService(prisma, env.OTP_HMAC_KEY),
  ...(payoutsRuntime ? { payoutProcessor: new PayoutProcessor(prisma, payoutsRuntime) } : {}),
  log,
});
log.info(
  {
    webPush: Boolean(webPush),
    email: env.EMAIL_PROVIDER,
    payouts: payoutsRuntime?.provider.name ?? 'off',
  },
  'worker started',
);

const shutdown = async (signal: string) => {
  log.info({ signal }, 'worker shutting down');
  await worker.close();
  await Promise.all([prisma.$disconnect(), valkey.quit()]);
  await Sentry.close(2000);
  process.exit(0);
};
process.once('SIGTERM', () => void shutdown('SIGTERM'));
process.once('SIGINT', () => void shutdown('SIGINT'));
