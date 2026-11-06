import { NotificationFanout, type Delivery } from '../modules/notifications/fanout';
import { prisma } from './helpers';

/** Outbox rows of one type, oldest first. */
export const outboxOf = (type: string) =>
  prisma.outboxEvent.findMany({ where: { type }, orderBy: { id: 'asc' } });

/**
 * Fans out every unprocessed outbox event in order, the way the worker does,
 * and returns the deliveries. `now` pins the clock (batch window).
 */
export async function drainOutbox(now?: () => Date): Promise<Delivery[]> {
  const fanout = new NotificationFanout(prisma, now);
  const events = await prisma.outboxEvent.findMany({
    where: { processedAt: null },
    orderBy: { id: 'asc' },
    select: { id: true },
  });
  const deliveries: Delivery[] = [];
  for (const event of events) deliveries.push(...(await fanout.process(event.id)));
  return deliveries;
}

/** The recipient's in-app rows, newest first. */
export const inboxOf = (userId: string) =>
  prisma.notification.findMany({ where: { userId }, orderBy: { id: 'desc' } });

/** Drops pending events (e.g. the sign-ins of test setup) without fanning them out. */
export const clearOutbox = () => prisma.outboxEvent.deleteMany();
