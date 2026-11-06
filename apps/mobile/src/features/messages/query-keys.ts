import type { EnquiryStatus } from '@supporters/shared';

/**
 * Chat caches. Every inbox page sits under `conversations`, every thread under `messages`,
 * so a realtime event can patch all of them (see chat-cache.ts).
 */
export const chatKeys = {
  conversations: ['conversations'] as const,
  inboxes: ['conversations', 'list'] as const,
  inbox: (viewer: string, q: string, hidden: boolean) =>
    ['conversations', 'list', viewer, q, hidden] as const,
  conversation: (id: string) => ['conversations', 'detail', id] as const,
  messages: ['messages'] as const,
  thread: (conversationId: string) => ['messages', conversationId] as const,
  attachment: (path: string) => ['attachments', path] as const,
  enquiries: ['enquiries'] as const,
  myEnquiries: (viewer: string) => ['enquiries', 'mine', viewer] as const,
  businessEnquiries: (viewer: string, filter: { status?: EnquiryStatus; listing?: string }) =>
    ['enquiries', 'business', viewer, filter.status ?? 'all', filter.listing ?? 'all'] as const,
};
