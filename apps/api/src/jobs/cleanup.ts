import { NOTIFICATION_LIMITS } from '@supporters/shared';
import type { PrismaClient } from '../generated/prisma/client';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Processed outbox rows are kept a week for debugging and replays. */
export const OUTBOX_RETENTION_DAYS = 7;
const BATCH = 5_000;

/**
 * The nightly cleanup: in-app notifications older than 90 days (product spec,
 * Notifications) and processed outbox events older than a week. Deletes in
 * batches so a large backlog never holds one long lock.
 */
export async function cleanupNotifications(prisma: PrismaClient, now = new Date()) {
  const notificationsBefore = new Date(now.getTime() - NOTIFICATION_LIMITS.retentionDays * DAY_MS);
  const outboxBefore = new Date(now.getTime() - OUTBOX_RETENTION_DAYS * DAY_MS);
  let notifications = 0;
  let outbox = 0;
  for (;;) {
    const deleted = await prisma.$executeRaw`
      DELETE FROM notifications WHERE id IN (
        SELECT id FROM notifications WHERE created_at < ${notificationsBefore} LIMIT ${BATCH})`;
    notifications += deleted;
    if (deleted < BATCH) break;
  }
  for (;;) {
    const deleted = await prisma.$executeRaw`
      DELETE FROM outbox_events WHERE id IN (
        SELECT id FROM outbox_events WHERE processed_at < ${outboxBefore} LIMIT ${BATCH})`;
    outbox += deleted;
    if (deleted < BATCH) break;
  }
  return { notifications, outbox };
}
