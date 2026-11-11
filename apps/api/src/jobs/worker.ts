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
import { expireRequirements } from '../modules/requirements/requirements.expiry';
import { cleanupNotifications } from './cleanup';
import { type FanoutJob, relayOutbox } from './outbox-relay';

/** Queue names (backend spec, Queues). */
export const QUEUE = {
  notifications: 'notifications',
  push: 'push',
  email: 'email',
  cron: 'cron',
  /** Jobs that used up their retries, kept for inspection and manual replay. */
  deadLetter: 'dead-letter',
} as const;

/** 5 tries with exponential backoff for every delivery queue (backend spec, Queues). */
export const JOB_ATTEMPTS = 5;

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
 * The notifications side of the worker process: the outbox relay, the
 * `notifications`, `push`, `email` and `cron` queues, and dead-lettering.
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

  const workers = [
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
        default:
          return null;
      }
    }),
  ];

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
  }

  let isStopped = false;
  let relaying: Promise<unknown> = Promise.resolve();
  const relayOnce = () => relayOutbox(prisma, queues.notifications);
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
