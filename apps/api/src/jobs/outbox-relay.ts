import type { PrismaClient } from '../generated/prisma/client';
import { SEARCH_SYNC_EVENT } from '../modules/search/search.sync';

export interface FanoutJob {
  eventId: string;
}

/** A `search.sync` outbox event to apply to Meilisearch. */
export interface SearchIndexJob {
  eventId: string;
}

/** The slice of a queue the relay uses. */
export interface BulkQueue<T> {
  addBulk(jobs: { name: string; data: T; opts: { jobId: string } }[]): Promise<unknown>;
}

export interface RelayQueues {
  notifications: BulkQueue<FanoutJob>;
  searchIndex: BulkQueue<SearchIndexJob>;
}

const BATCH = 100;

/**
 * Moves committed outbox events onto their queue: `search.sync` events to
 * `search-index`, everything else to `notifications`. Rows are claimed with
 * SKIP LOCKED, so several workers can relay at once. The job id is the event
 * id, so an event queued twice (a crash between enqueue and commit) is still
 * one job.
 */
export async function relayOutbox(prisma: PrismaClient, queues: RelayQueues): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string; type: string }[]>`
      SELECT id, type FROM outbox_events WHERE published_at IS NULL
      ORDER BY id LIMIT ${BATCH} FOR UPDATE SKIP LOCKED`;
    if (rows.length === 0) return 0;
    const search = rows.filter((row) => row.type === SEARCH_SYNC_EVENT);
    const fanout = rows.filter((row) => row.type !== SEARCH_SYNC_EVENT);
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
    await tx.outboxEvent.updateMany({
      where: { id: { in: rows.map((row) => row.id) } },
      data: { publishedAt: new Date() },
    });
    return rows.length;
  });
}
