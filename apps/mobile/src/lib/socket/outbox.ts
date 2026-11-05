import { listingRefSchema, SENDABLE_MESSAGE_TYPES } from '@supporters/shared';
import { z } from 'zod';
import type { KeyValueStore } from '../storage/encrypted-storage';

const STORAGE_KEY = 'chat.outbox.v1';
/** A queue this long means the device has been offline for a while; older sends are dropped. */
export const OUTBOX_MAX_ITEMS = 100;

/** One unsent message. Attachments are uploaded before a message is queued. */
export const outboxItemSchema = z.object({
  clientId: z.uuid(),
  conversationId: z.uuid(),
  /** The account that wrote it: another account signing in on this device never sends it. */
  userId: z.uuid(),
  draft: z.object({
    type: z.enum(SENDABLE_MESSAGE_TYPES),
    body: z.string().optional(),
    attachmentIds: z.array(z.uuid()).optional(),
    listing: listingRefSchema.optional(),
  }),
  createdAt: z.iso.datetime(),
});
export type OutboxItem = z.infer<typeof outboxItemSchema>;

export interface Outbox {
  /** In the order they were written. */
  list(userId: string): OutboxItem[];
  /** Adds or replaces (same clientId) an item. */
  put(item: OutboxItem): void;
  remove(clientId: string): void;
  clear(): void;
}

/**
 * The chat outbox (mobile spec, Realtime): messages that have not been acked yet, kept in the
 * encrypted store so they survive a restart and retry with the same `clientId`.
 */
export function createOutbox(storage: KeyValueStore): Outbox {
  const read = (): OutboxItem[] => {
    const raw = storage.getString(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = z.array(z.unknown()).safeParse(JSON.parse(raw));
      if (!parsed.success) return [];
      // Drop anything that no longer parses rather than losing the whole queue.
      return parsed.data.flatMap((entry) => {
        const item = outboxItemSchema.safeParse(entry);
        return item.success ? [item.data] : [];
      });
    } catch {
      return [];
    }
  };
  const write = (items: OutboxItem[]) => {
    if (items.length === 0) storage.remove(STORAGE_KEY);
    else storage.set(STORAGE_KEY, JSON.stringify(items.slice(-OUTBOX_MAX_ITEMS)));
  };

  return {
    list: (userId) => read().filter((item) => item.userId === userId),
    put: (item) => {
      const next = outboxItemSchema.parse(item);
      const items = read();
      const index = items.findIndex((existing) => existing.clientId === next.clientId);
      if (index >= 0) items[index] = next;
      else items.push(next);
      write(items);
    },
    remove: (clientId) => write(read().filter((item) => item.clientId !== clientId)),
    clear: () => storage.remove(STORAGE_KEY),
  };
}
