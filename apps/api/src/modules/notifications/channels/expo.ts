import type { PushData } from '@supporters/shared';

/** One Expo push message (https://docs.expo.dev/push-notifications/sending-notifications/). */
export interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  data: PushData;
  sound: 'default';
  /** The Android notification channel set up by the app. */
  channelId: string;
  priority: 'default' | 'high';
}

export type ExpoTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; message?: string; details?: { error?: string } };

export type ExpoReceipt =
  { status: 'ok' } | { status: 'error'; message?: string; details?: { error?: string } };

/** The Expo Push API. Tests use a fake. */
export interface ExpoPushClient {
  /** One ticket per message, in order. */
  send(messages: ExpoMessage[]): Promise<ExpoTicket[]>;
  getReceipts(ticketIds: string[]): Promise<Record<string, ExpoReceipt>>;
}

/** The app was uninstalled or the token is no longer valid: delete it. */
export const isDeadToken = (result: ExpoTicket | ExpoReceipt) =>
  result.status === 'error' && result.details?.error === 'DeviceNotRegistered';

const EXPO_API = 'https://exp.host/--/api/v2/push';
/** Expo's per-request maximums. */
export const EXPO_SEND_BATCH = 100;
export const EXPO_RECEIPTS_BATCH = 1_000;

export class HttpExpoPushClient implements ExpoPushClient {
  constructor(private readonly accessToken: string | undefined) {}

  async send(messages: ExpoMessage[]): Promise<ExpoTicket[]> {
    const tickets: ExpoTicket[] = [];
    for (let i = 0; i < messages.length; i += EXPO_SEND_BATCH) {
      const body = await this.post<{ data: ExpoTicket[] }>(
        '/send',
        messages.slice(i, i + EXPO_SEND_BATCH),
      );
      tickets.push(...body.data);
    }
    return tickets;
  }

  async getReceipts(ticketIds: string[]): Promise<Record<string, ExpoReceipt>> {
    const receipts: Record<string, ExpoReceipt> = {};
    for (let i = 0; i < ticketIds.length; i += EXPO_RECEIPTS_BATCH) {
      const body = await this.post<{ data: Record<string, ExpoReceipt> }>('/getReceipts', {
        ids: ticketIds.slice(i, i + EXPO_RECEIPTS_BATCH),
      });
      Object.assign(receipts, body.data);
    }
    return receipts;
  }

  private async post<T>(path: string, payload: unknown): Promise<T> {
    const response = await fetch(`${EXPO_API}${path}`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        ...(this.accessToken ? { authorization: `Bearer ${this.accessToken}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });
    // A failed request is retried by the job (5x exponential).
    if (!response.ok) throw new Error(`Expo push ${path} failed with ${response.status}`);
    return (await response.json()) as T;
  }
}

interface Pending {
  message: ExpoMessage;
  resolve: (ticket: ExpoTicket) => void;
  reject: (error: unknown) => void;
}

/**
 * Coalesces the messages of concurrent push jobs into one Expo request of up
 * to 100, waiting at most `lingerMs` for a batch to fill.
 */
export class ExpoPushBatcher {
  private pending: Pending[] = [];
  private timer: NodeJS.Timeout | undefined;

  constructor(
    readonly client: ExpoPushClient,
    private readonly lingerMs = 25,
  ) {}

  send(messages: ExpoMessage[]): Promise<ExpoTicket[]> {
    const tickets = messages.map(
      (message) =>
        new Promise<ExpoTicket>((resolve, reject) => {
          this.pending.push({ message, resolve, reject });
        }),
    );
    if (this.pending.length >= EXPO_SEND_BATCH) this.flush();
    else this.timer ??= setTimeout(() => this.flush(), this.lingerMs);
    return Promise.all(tickets);
  }

  private flush() {
    clearTimeout(this.timer);
    this.timer = undefined;
    while (this.pending.length > 0) {
      const batch = this.pending.splice(0, EXPO_SEND_BATCH);
      this.client.send(batch.map((item) => item.message)).then(
        (tickets) =>
          batch.forEach((item, index) =>
            item.resolve(tickets[index] ?? { status: 'error', message: 'no ticket' }),
          ),
        (error: unknown) => batch.forEach((item) => item.reject(error)),
      );
    }
  }
}
