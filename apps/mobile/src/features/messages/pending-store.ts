import { create } from 'zustand';
import type { OutboxItem } from '../../lib/socket';

/** What the bubble shows before the server has the message (local file previews, titles). */
export interface LocalPreview {
  imageUris?: string[];
  fileName?: string;
  listingTitle?: string;
}

/** A message on screen that the server has not echoed back yet. */
export interface LocalMessage {
  item: OutboxItem;
  status: 'sending' | 'failed';
  /** The API code when it failed for good. */
  code?: string;
  preview?: LocalPreview;
}

interface PendingState {
  byClientId: Record<string, LocalMessage>;
  /** Adds new ones; an entry already shown keeps its preview and status. */
  hydrate: (items: OutboxItem[]) => void;
  add: (item: OutboxItem, preview?: LocalPreview) => void;
  fail: (clientId: string, code: string) => void;
  retry: (clientId: string) => void;
  remove: (clientId: string) => void;
  clear: () => void;
}

/** Optimistic chat messages (mobile spec, Caching: optimistic send message). */
export const usePendingStore = create<PendingState>()((set) => ({
  byClientId: {},
  hydrate: (items) =>
    set((state) => {
      const next = { ...state.byClientId };
      for (const item of items) next[item.clientId] ??= { item, status: 'sending' };
      return { byClientId: next };
    }),
  add: (item, preview) =>
    set((state) => ({
      byClientId: { ...state.byClientId, [item.clientId]: { item, status: 'sending', preview } },
    })),
  fail: (clientId, code) =>
    set((state) => {
      const entry = state.byClientId[clientId];
      if (!entry) return state;
      return {
        byClientId: { ...state.byClientId, [clientId]: { ...entry, status: 'failed', code } },
      };
    }),
  retry: (clientId) =>
    set((state) => {
      const entry = state.byClientId[clientId];
      if (!entry) return state;
      const { code: _dropped, ...rest } = entry;
      return { byClientId: { ...state.byClientId, [clientId]: { ...rest, status: 'sending' } } };
    }),
  remove: (clientId) =>
    set((state) => {
      if (!(clientId in state.byClientId)) return state;
      const { [clientId]: _removed, ...rest } = state.byClientId;
      return { byClientId: rest };
    }),
  clear: () => set({ byClientId: {} }),
}));

/** Newest first, like the thread pages. */
export function pendingFor(byClientId: Record<string, LocalMessage>, conversationId: string) {
  return Object.values(byClientId)
    .filter((entry) => entry.item.conversationId === conversationId)
    .sort((a, b) => b.item.createdAt.localeCompare(a.item.createdAt));
}
