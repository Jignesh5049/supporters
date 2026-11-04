import { FEED_LIMITS } from '@supporters/shared';

export interface SeenBatcher {
  /** Queues posts shown on screen; each id is sent once. */
  add(postIds: string[]): void;
  /** Sends whatever is queued now (on unmount or backgrounding). */
  flush(): void;
  dispose(): void;
}

/**
 * Collects the posts a signed-in user has seen and reports them with
 * `POST /feed/seen` in batches, so the feed's fill part skips them.
 * A failed batch is forgotten, so those ids can be sent again later.
 */
export function createSeenBatcher(
  send: (postIds: string[]) => Promise<void>,
  { delayMs = 2_000, max = FEED_LIMITS.seenBatchMax }: { delayMs?: number; max?: number } = {},
): SeenBatcher {
  const sent = new Set<string>();
  let queue: string[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const flush = () => {
    clearTimer();
    while (queue.length > 0) {
      const batch = queue.slice(0, max);
      queue = queue.slice(max);
      send(batch).catch(() => {
        for (const id of batch) sent.delete(id);
      });
    }
  };

  return {
    add(postIds) {
      for (const id of postIds) {
        if (sent.has(id)) continue;
        sent.add(id);
        queue.push(id);
      }
      if (queue.length >= max) flush();
      else if (queue.length > 0 && !timer) timer = setTimeout(flush, delayMs);
    },
    flush,
    dispose: clearTimer,
  };
}
