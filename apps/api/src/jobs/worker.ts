import { type Job, type JobsOptions, Queue, Worker } from 'bullmq';
import type { FastifyBaseLogger } from 'fastify';
import { Redis } from 'ioredis';
import type { Env } from '../config/env';
import type { PrismaClient } from '../generated/prisma/client';
import { ExpoPushBatcher, type ExpoPushClient } from '../modules/notifications/channels/expo';
import type { EmailSender } from '../modules/notifications/channels/email';
import type { WebPushSender } from '../modules/notifications/channels/web-push';
import {
  DeliveryScheduler,
  EmailDelivery,
  type EmailJob,
  PushDelivery,
  type PushJob,
  type ReceiptsJob,
} from '../modules/notifications/delivery';
import { NotificationFanout } from '../modules/notifications/fanout';
import type { InvoicesService } from '../modules/payments/invoices.service';
import { PremiumLifecycle } from '../modules/payments/lifecycle';
import { PaymentsProcessor } from '../modules/payments/payments.processor';
import type { PaymentsProvider } from '../modules/payments/provider';
import type { SearchIndexer } from '../modules/search/search.indexer';
import { recordPremiumExpirySyncs } from '../modules/search/search.sync';
import { expireRequirements } from '../modules/requirements/requirements.expiry';
import { cleanupNotifications } from './cleanup';
import {
  type FanoutJob,
  type PaymentsQueueJob,
  type SearchIndexJob,
  relayOutbox,
} from './outbox-relay';

/** Queue names (backend spec, Queues). */
export const QUEUE = {
  notifications: 'notifications',
  push: 'push',
  email: 'email',
  cron: 'cron',
  /** Upserts or deletes businesses, products, services and posts in Meilisearch. */
  searchIndex: 'search-index',
  /** Razorpay webhooks, then invoice PDFs. */
  payments: 'payments',
  /** Jobs that used up their retries, kept for inspection and manual replay. */
  deadLetter: 'dead-letter',
} as const;

/** 5 tries with exponential backoff for every delivery queue (backend spec, Queues). */
export const JOB_ATTEMPTS = 5;
/** Search indexing retries 10 times (backend spec, Queues). */
export const SEARCH_JOB_ATTEMPTS = 10;
/** Payments retry 10 times with exponential backoff, then dead-letter (backend spec, Queues). */
export const PAYMENTS_JOB_ATTEMPTS = 10;

export interface DeadLetter {
  queue: string;
  name: string;
  jobId: string | undefined;
  data: unknown;
  failedReason: string;
  attemptsMade: number;
}

export interface NotificationWorkerOptions {
  env: Pick<Env, 'VALKEY_URL' | 'APP_ORIGIN'>;
  prisma: PrismaClient;
  /** Publishes badge counts for the API's sockets. */
  valkey: Redis;
  expo: ExpoPushClient;
  webPush: WebPushSender | null;
  email: EmailSender;
  /** Consumes `search-index`; without it, sync events are queued but wait for a worker that has one. */
  searchIndexer?: SearchIndexer;
  /** Consumes `payments` and runs the Premium cron jobs; without it, payments jobs wait for a worker that has it. */
  payments?: { provider: PaymentsProvider | null; invoices: InvoicesService };
  log: FastifyBaseLogger;
  /** First retry delay; doubles on each attempt. */
  backoffMs?: number;
  relayIntervalMs?: number;
  /** Valkey key prefix; tests isolate themselves with their own. */
  prefix?: string;
  now?: () => Date;
  /** Tests drive the relay and cleanup by hand. */
  isRelayLoopOn?: boolean;
  isCleanupScheduled?: boolean;
}

/**
 * The worker process: the outbox relay, the `notifications`, `push`,
 * `email`, `cron` and `search-index` queues, and dead-lettering.
 */
export async function startNotificationWorker(options: NotificationWorkerOptions) {
  const { prisma, log } = options;
  const connection = new Redis(options.env.VALKEY_URL, { maxRetriesPerRequest: null });
  const prefix = options.prefix ?? 'bull';
  const defaultJobOptions: JobsOptions = {
    attempts: JOB_ATTEMPTS,
    backoff: { type: 'exponential', delay: options.backoffMs ?? 1_000 },
    removeOnComplete: { age: 24 * 3600, count: 10_000 },
    removeOnFail: { age: 7 * 24 * 3600 },
  };
  const queue = <T>(name: string, jobOptions: JobsOptions = defaultJobOptions) =>
    new Queue<T>(name, { connection, prefix, defaultJobOptions: jobOptions });

  const queues = {
    notifications: queue<FanoutJob>(QUEUE.notifications),
    push: queue<PushJob | ReceiptsJob>(QUEUE.push),
    email: queue<EmailJob>(QUEUE.email),
    cron: queue<Record<string, never>>(QUEUE.cron, { attempts: 1, removeOnComplete: 100 }),
    searchIndex: queue<SearchIndexJob>(QUEUE.searchIndex, {
      ...defaultJobOptions,
      attempts: SEARCH_JOB_ATTEMPTS,
    }),
    payments: queue<PaymentsQueueJob>(QUEUE.payments, {
      ...defaultJobOptions,
      attempts: PAYMENTS_JOB_ATTEMPTS,
    }),
    deadLetter: queue<DeadLetter>(QUEUE.deadLetter, { removeOnComplete: false }),
  };

  const fanout = new NotificationFanout(prisma, options.now);
  const scheduler = new DeliveryScheduler(
    prisma,
    options.valkey,
    queues.push,
    queues.email,
    options.now,
  );
  const push = new PushDelivery(
    prisma,
    new ExpoPushBatcher(options.expo),
    options.webPush,
    queues.push,
  );
  const email = new EmailDelivery(prisma, options.email, options.env.APP_ORIGIN);

  const lifecycle = new PremiumLifecycle(prisma, options.payments?.provider ?? null, log);
  const worker = <T>(name: string, concurrency: number, run: (job: Job<T>) => Promise<unknown>) => {
    const instance = new Worker<T>(name, run, { connection, prefix, concurrency });
    instance.on('failed', (job, error) => {
      if (!job) return;
      const attempts = job.opts.attempts ?? 1;
      // Ids only in the log; job data never holds message text or contact details.
      log.warn({ queue: name, jobId: job.id, attempt: job.attemptsMade, err: error }, 'job failed');
      if (job.attemptsMade < attempts) return;
      const letter: DeadLetter = {
        queue: name,
        name: job.name,
        jobId: job.id,
        data: job.data,
        failedReason: error.message,
        attemptsMade: job.attemptsMade,
      };
      queues.deadLetter.add('dead', letter).catch((err: unknown) => {
        log.error({ queue: name, jobId: job.id, err }, 'dead-lettering failed');
      });
    });
    instance.on('error', (error) => log.error({ queue: name, err: error }, 'worker error'));
    return instance;
  };

  const workers: { close(): Promise<void> }[] = [
    worker<FanoutJob>(QUEUE.notifications, 10, async (job) => {
      const deliveries = await fanout.process(job.data.eventId);
      await scheduler.schedule(job.data.eventId, deliveries);
      return deliveries.length;
    }),
    worker<PushJob | ReceiptsJob>(QUEUE.push, 20, async (job) =>
      'tickets' in job.data ? push.checkReceipts(job.data) : push.deliver(job.data),
    ),
    worker<EmailJob>(QUEUE.email, 5, async (job) => email.deliver(job.data)),
    worker<Record<string, never>>(QUEUE.cron, 1, async (job) => {
      switch (job.name) {
        case 'cleanup':
          return cleanupNotifications(prisma, options.now?.());
        case 'expire-requirements':
          return expireRequirements(prisma, options.now?.());
        case 'search-premium-expiry':
          return recordPremiumExpirySyncs(prisma, options.now?.());
        case 'premium-expiry':
          return lifecycle.expireDue(options.now?.());
        case 'premium-reminders':
          return lifecycle.sendRenewalReminders(options.now?.());
        default:
          return null;
      }
    }),
  ];
  const { searchIndexer, payments } = options;
  if (payments) {
    const processor = new PaymentsProcessor(prisma, payments.provider, payments.invoices, log);
    // Two jobs for one subscription are serialised by its row lock, so several run at once.
    workers.push(
      worker<PaymentsQueueJob>(QUEUE.payments, 5, async (job) => {
        if (job.name === 'invoice-pdf' && job.data.invoiceId) {
          return payments.invoices.generatePdf(job.data.invoiceId);
        }
        if (job.data.webhookEventId) return processor.process(job.data.webhookEventId);
        return null;
      }),
    );
  }
  if (searchIndexer) {
    // One at a time: each job re-reads its row and writes it, so two jobs for the same row
    // can never interleave and leave the older state in the index.
    workers.push(
      worker<SearchIndexJob>(QUEUE.searchIndex, 1, async (job) =>
        searchIndexer.processEvent(job.data.eventId),
      ),
    );
  }

  if (options.isCleanupScheduled !== false) {
    // 03:00 IST, the quietest hour.
    await queues.cron.upsertJobScheduler(
      'notifications-cleanup',
      { pattern: '0 3 * * *', tz: 'Asia/Kolkata' },
      { name: 'cleanup' },
    );
    // Reads treat a requirement as expired from expires_at; this catches the stored status up.
    await queues.cron.upsertJobScheduler(
      'requirements-expiry',
      { pattern: '5 * * * *', tz: 'Asia/Kolkata' },
      { name: 'expire-requirements' },
    );
    if (payments) {
      // Premium ends by time: close out finished periods and graces hourly, and remind owners
      // once a day (10:00 IST) that renewal is a week away.
      await queues.cron.upsertJobScheduler(
        'premium-expiry',
        { pattern: '10 * * * *', tz: 'Asia/Kolkata' },
        { name: 'premium-expiry' },
      );
      await queues.cron.upsertJobScheduler(
        'premium-reminders',
        { pattern: '0 10 * * *', tz: 'Asia/Kolkata' },
        { name: 'premium-reminders' },
      );
    }
    if (searchIndexer) {
      // Hourly: Premium's search boost ends with Premium (see recordPremiumExpirySyncs).
      await queues.cron.upsertJobScheduler(
        'search-premium-expiry',
        { pattern: '5 * * * *', tz: 'Asia/Kolkata' },
        { name: 'search-premium-expiry' },
      );
    }
  }

  let isStopped = false;
  let relaying: Promise<unknown> = Promise.resolve();
  const relayOnce = () => relayOutbox(prisma, queues);
  const loop = async () => {
    while (!isStopped) {
      try {
        // Drain a backlog without waiting between full batches.
        if ((await relayOnce()) > 0) continue;
      } catch (error) {
        log.error({ err: error }, 'outbox relay failed');
      }
      await new Promise((resolve) => setTimeout(resolve, options.relayIntervalMs ?? 1_000));
    }
  };
  if (options.isRelayLoopOn !== false) relaying = loop();

  return {
    queues,
    relayOnce,
    /** Stops relaying, lets running jobs finish, then closes every connection. */
    async close() {
      isStopped = true;
      await relaying;
      await Promise.all(workers.map((w) => w.close()));
      await Promise.all(Object.values(queues).map((q) => q.close()));
      await connection.quit();
    },
  };
}

export type NotificationWorker = Awaited<ReturnType<typeof startNotificationWorker>>;
