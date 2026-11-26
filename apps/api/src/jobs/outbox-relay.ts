import type { PrismaClient } from '../generated/prisma/client';
import type { PayoutJob } from '../modules/payouts/payout-processor';
import { SEARCH_SYNC_EVENT } from '../modules/search/search.sync';
import { MEDIA_PROCESS_EVENT, type MediaJob } from '../modules/uploads/media-jobs';

export interface FanoutJob {
  eventId: string;
}

/** A `search.sync` outbox event to apply to Meilisearch. */
export interface SearchIndexJob {
  eventId: string;
}

/** A `payments.webhook` or `payments.invoice` outbox event for the `payments` queue. */
export interface PaymentsQueueJob {
  webhookEventId?: string;
  invoiceId?: string;
}

/** Outbox types that go to the `payments` queue. */
export const PAYMENTS_WEBHOOK_EVENT = 'payments.webhook';
export const PAYMENTS_INVOICE_EVENT = 'payments.invoice';

/** The slice of a queue the relay uses. */
export interface BulkQueue<T> {
  addBulk(jobs: { name: string; data: T; opts: { jobId: string } }[]): Promise<unknown>;
}

export interface RelayQueues {
  notifications: BulkQueue<FanoutJob>;
  searchIndex: BulkQueue<SearchIndexJob>;
  payments: BulkQueue<PaymentsQueueJob>;
  /** Without it, `payout.requested` events stay in the outbox for a worker that has one. */
  payouts?: BulkQueue<PayoutJob>;
  media: BulkQueue<MediaJob>;
}

const PAYOUT_REQUESTED_EVENT = 'payout.requested';

const BATCH = 100;

/**
 * Moves committed outbox events onto their queue: `search.sync` events to
 * `search-index`, `media.process` events to `media`, everything else to `notifications`. Rows are claimed with
 * SKIP LOCKED, so several workers can relay at once. The job id is the event
 * id, so an event queued twice (a crash between enqueue and commit) is still
 * one job.
 */
export async function relayOutbox(prisma: PrismaClient, queues: RelayQueues): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<
      { id: string; type: string; payload: PaymentsQueueJob & { uploadId?: string } }[]
    >`
      SELECT id, type, payload FROM outbox_events WHERE published_at IS NULL
        AND (type <> ${PAYOUT_REQUESTED_EVENT} OR ${Boolean(queues.payouts)})
      ORDER BY id LIMIT ${BATCH} FOR UPDATE SKIP LOCKED`;
    if (rows.length === 0) return 0;
    const search = rows.filter((row) => row.type === SEARCH_SYNC_EVENT);
    const media = rows.filter((row) => row.type === MEDIA_PROCESS_EVENT);
    const payouts = rows.filter((row) => row.type === PAYOUT_REQUESTED_EVENT);
    const payments = rows.filter(
      (row) => row.type === PAYMENTS_WEBHOOK_EVENT || row.type === PAYMENTS_INVOICE_EVENT,
    );
    const fanout = rows.filter(
      (row) =>
        row.type !== SEARCH_SYNC_EVENT &&
        row.type !== MEDIA_PROCESS_EVENT &&
        row.type !== PAYOUT_REQUESTED_EVENT &&
        !payments.some((p) => p.id === row.id),
    );
    if (payments.length > 0) {
      await queues.payments.addBulk(
        payments.map(({ id, type, payload }) => ({
          name: type === PAYMENTS_WEBHOOK_EVENT ? 'webhook' : 'invoice-pdf',
          data: payload,
          opts: { jobId: `pay-${id}` },
        })),
      );
    }
    if (fanout.length > 0) {
      await queues.notifications.addBulk(
        fanout.map(({ id }) => ({
          name: 'fanout',
          data: { eventId: id },
          opts: { jobId: `evt-${id}` },
        })),
      );
    }
    if (search.length > 0) {
      await queues.searchIndex.addBulk(
        search.map(({ id }) => ({
          name: 'sync',
          data: { eventId: id },
          opts: { jobId: `search-${id}` },
        })),
      );
    }
    if (media.length > 0) {
      await queues.media.addBulk(
        media.map(({ id, payload }) => ({
          name: 'process',
          data: { eventId: id, uploadId: String(payload.uploadId) },
          opts: { jobId: `media-${id}` },
        })),
      );
    }
    if (payouts.length > 0 && queues.payouts) {
      await queues.payouts.addBulk(
        payouts.map(({ id }) => ({
          name: 'payout',
          data: { eventId: id },
          opts: { jobId: `payout-${id}` },
        })),
      );
    }
    await tx.outboxEvent.updateMany({
      where: { id: { in: rows.map((row) => row.id) } },
      data: { publishedAt: new Date() },
    });
    return rows.length;
  });
}
