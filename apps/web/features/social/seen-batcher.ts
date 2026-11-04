import { FEED_LIMITS } from '@supporters/shared';

/**
 * Collects the ids of posts the viewer has seen and sends them in batches
 * (`POST /v1/feed/seen`), so the personal feed skips them next time. Each id
 * is sent once per page load; a failed batch is dropped (it is only a hint).
 */
export function createSeenBatcher(send: (postIds: string[]) => Promise<unknown>) {
  const sent = new Set<string>();
  let pending: string[] = [];

  return {
    add(postId: string) {
      if (sent.has(postId)) return;
      sent.add(postId);
      pending.push(postId);
    },
    flush() {
      while (pending.length > 0) {
        const batch = pending.slice(0, FEED_LIMITS.seenBatchMax);
        pending = pending.slice(FEED_LIMITS.seenBatchMax);
        void send(batch).catch(() => undefined);
      }
    },
    get pendingCount() {
      return pending.length;
    },
  };
}
