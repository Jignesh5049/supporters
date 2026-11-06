import type { PrismaClient } from '../generated/prisma/client';

export interface FanoutJob {
  eventId: string;
}

/** The slice of the notifications queue the relay uses. */
export interface BulkQueue {
  addBulk(jobs: { name: string; data: FanoutJob; opts: { jobId: string } }[]): Promise<unknown>;
}

const BATCH = 100;

/**
 * Moves committed outbox events onto the notifications queue. Rows are claimed
 * with SKIP LOCKED, so several workers can relay at once. The job id is the
 * event id, so an event queued twice (a crash between enqueue and commit) is
 * still one job.
 */
export async function relayOutbox(prisma: PrismaClient, queue: BulkQueue): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM outbox_events WHERE published_at IS NULL
      ORDER BY id LIMIT ${BATCH} FOR UPDATE SKIP LOCKED`;
    if (rows.length === 0) return 0;
    await queue.addBulk(
      rows.map(({ id }) => ({
        name: 'fanout',
        data: { eventId: id },
        opts: { jobId: `evt-${id}` },
      })),
    );
    await tx.outboxEvent.updateMany({
      where: { id: { in: rows.map((row) => row.id) } },
      data: { publishedAt: new Date() },
    });
    return rows.length;
  });
}
