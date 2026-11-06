import webpush from 'web-push';

export interface WebPushTarget {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export interface WebPushOptions {
  /** Seconds the push service keeps it for an offline browser. */
  ttlSec: number;
  urgency: 'normal' | 'high';
  /** Replaces an undelivered push with the same topic (batched items). */
  topic?: string;
}

/** Resolves with the push service's status code. Tests use a fake. */
export interface WebPushSender {
  send(target: WebPushTarget, payload: string, options: WebPushOptions): Promise<number>;
}

/** The subscription expired or was revoked: delete it. */
export const isGoneStatus = (statusCode: number) => statusCode === 404 || statusCode === 410;

/** web-push 3.6 with VAPID keys from the environment. */
export class VapidWebPushSender implements WebPushSender {
  constructor(private readonly vapid: { subject: string; publicKey: string; privateKey: string }) {}

  async send(target: WebPushTarget, payload: string, options: WebPushOptions): Promise<number> {
    try {
      const result = await webpush.sendNotification(target, payload, {
        vapidDetails: this.vapid,
        TTL: options.ttlSec,
        urgency: options.urgency,
        timeout: 10_000,
        ...(options.topic ? { topic: options.topic } : {}),
      });
      return result.statusCode;
    } catch (error) {
      // 404 and 410 come back as errors; return them so the caller can prune.
      if (error instanceof webpush.WebPushError && isGoneStatus(error.statusCode)) {
        return error.statusCode;
      }
      throw error;
    }
  }
}
