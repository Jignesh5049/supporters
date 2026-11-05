import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CHAT_LIMITS, type Conversation, type UpdateConversationInput } from '@supporters/shared';
import { chatApi } from '../../../lib/api';
import { useViewerId } from '../../social/use-viewer';
import { findCachedConversation, patchConversation, type InboxData } from '../chat-cache';
import { chatKeys } from '../query-keys';

/** Search text as the API takes it: trimmed, capped, or nothing. */
export function inboxSearch(text: string): string {
  return text.trim().slice(0, CHAT_LIMITS.searchQueryMax);
}

/** The inbox (GET /v1/conversations), latest activity first; `q` searches the other end's name. */
export function useConversations(search = '', options: { hidden?: boolean } = {}) {
  const viewerId = useViewerId();
  const q = inboxSearch(search);
  const hidden = options.hidden ?? false;
  return useInfiniteQuery({
    queryKey: chatKeys.inbox(viewerId ?? 'guest', q, hidden),
    queryFn: ({ pageParam }) =>
      chatApi.conversations({ cursor: pageParam, q: q || undefined, hidden }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: viewerId !== null,
  });
}

/** Unread messages across the first inbox page, for the tab badge. */
export function useUnreadMessagesCount(): number {
  const inbox = useConversations();
  return (inbox.data?.pages ?? []).reduce(
    (total, page) =>
      total + page.data.reduce((sum, conversation) => sum + conversation.unreadCount, 0),
    0,
  );
}

/** Inbox pages scanned for a thread opened from a link or push (no GET /conversations/:id yet). */
const LOOKUP_PAGES = 3;

/**
 * One conversation: from the inbox cache when it is there, else looked up in the first inbox
 * pages (visible, then hidden). Null when it is not one of the viewer's threads.
 */
export function useConversation(id: string) {
  const viewerId = useViewerId();
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: chatKeys.conversation(id),
    queryFn: async (): Promise<Conversation | null> => {
      const cached = findCachedConversation(queryClient, id);
      if (cached) return cached;
      for (const hidden of [false, true]) {
        let cursor: string | undefined;
        for (let page = 0; page < LOOKUP_PAGES; page += 1) {
          const result = await chatApi.conversations({ cursor, hidden, limit: 50 });
          const hit = result.data.find((conversation) => conversation.id === id);
          if (hit) return hit;
          if (!result.nextCursor) break;
          cursor = result.nextCursor;
        }
      }
      return null;
    },
    initialData: () => findCachedConversation(queryClient, id) ?? undefined,
    enabled: viewerId !== null && id.length > 0,
  });
}

/** Opens (or returns) the one thread with a business: POST /v1/conversations. */
export function useOpenConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (businessId: string) => chatApi.open(businessId),
    onSuccess: (conversation) => {
      queryClient.setQueryData(chatKeys.conversation(conversation.id), conversation);
      void queryClient.invalidateQueries({ queryKey: chatKeys.inboxes });
    },
  });
}

/** Mute or hide, optimistic. Hiding drops the thread from the visible inbox. */
export function useUpdateConversation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateConversationInput) => chatApi.update(id, data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: chatKeys.conversations });
      const snapshot = queryClient.getQueriesData<InboxData | Conversation | null>({
        queryKey: chatKeys.conversations,
      });
      patchConversation(queryClient, id, (conversation) => ({ ...conversation, ...data }));
      return { snapshot };
    },
    onError: (_error, _data, context) => {
      for (const [key, value] of context?.snapshot ?? []) queryClient.setQueryData(key, value);
    },
    onSuccess: (conversation) => {
      queryClient.setQueryData(chatKeys.conversation(id), conversation);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: chatKeys.inboxes }),
  });
}

/** Block or unblock the other end (PUT/DELETE /v1/blocks/:userId). */
export function useSetBlocked(conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isBlocked }: { userId: string; isBlocked: boolean }) =>
      chatApi.setBlocked(userId, isBlocked),
    onSuccess: (state) => {
      queryClient.setQueryData(['blocks', conversationId], state.isBlocked);
      // The blocker's inbox leaves the thread out; unblocking brings it back.
      void queryClient.invalidateQueries({ queryKey: chatKeys.inboxes });
    },
  });
}
