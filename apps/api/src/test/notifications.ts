import webpush from 'web-push';
import type {
  ExpoMessage,
  ExpoPushClient,
  ExpoReceipt,
  ExpoTicket,
} from '../modules/notifications/channels/expo';
import type { Email, EmailSender } from '../modules/notifications/channels/email';
import type {
  WebPushOptions,
  WebPushSender,
  WebPushTarget,
} from '../modules/notifications/channels/web-push';
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

/** Records sends; `ticketFor` decides each ticket, `receipts` answers getReceipts. */
export class FakeExpo implements ExpoPushClient {
  readonly sent: ExpoMessage[][] = [];
  ticketFor: (message: ExpoMessage, index: number) => ExpoTicket = (_m, index) => ({
    status: 'ok',
    id: `ticket-${this.sent.length}-${index}`,
  });
  receipts: Record<string, ExpoReceipt> = {};

  async send(messages: ExpoMessage[]) {
    this.sent.push(messages);
    return messages.map((message, index) => this.ticketFor(message, index));
  }

  async getReceipts(ids: string[]) {
    return Object.fromEntries(
      ids.flatMap((id) => (this.receipts[id] ? [[id, this.receipts[id]]] : [])),
    );
  }

  get messages() {
    return this.sent.flat();
  }
}

export class FakeWebPush implements WebPushSender {
  readonly sent: { target: WebPushTarget; payload: string; options: WebPushOptions }[] = [];
  status = 201;

  async send(target: WebPushTarget, payload: string, options: WebPushOptions) {
    this.sent.push({ target, payload, options });
    return this.status;
  }
}

export class FakeEmail implements EmailSender {
  readonly sent: Email[] = [];
  error: Error | null = null;

  async send(email: Email) {
    if (this.error) throw this.error;
    this.sent.push(email);
  }
}

/** A fresh VAPID key pair, in the env format. */
export const vapidEnv = () => {
  const keys = webpush.generateVAPIDKeys();
  return {
    VAPID_PUBLIC_KEY: keys.publicKey,
    VAPID_PRIVATE_KEY: keys.privateKey,
    VAPID_SUBJECT: 'mailto:dev@supporters.test',
  };
};
