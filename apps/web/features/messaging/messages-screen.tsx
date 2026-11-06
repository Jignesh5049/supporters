'use client';

import { cn } from '@supporters/ui-web/lib/utils';
import type { ListingDraft } from './composer';
import { InboxPanel } from './inbox-panel';
import { ThreadEmpty, ThreadPanel } from './thread-panel';

interface MessagesScreenProps {
  conversationId: string | null;
  initialListing: ListingDraft | null;
}

/**
 * The inbox beside the open thread. On small screens one shows at a time:
 * the list at `/messages`, the thread at `/messages/<id>`.
 */
export function MessagesScreen({ conversationId, initialListing }: MessagesScreenProps) {
  return (
    <div className="flex h-160 max-h-svh overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
      <aside
        aria-label="Inbox"
        className={cn(
          'h-full w-full shrink-0 border-r border-border md:flex md:w-80 lg:w-96',
          conversationId ? 'hidden' : 'flex',
        )}
      >
        <div className="w-full">
          <InboxPanel activeId={conversationId} />
        </div>
      </aside>
      <section
        aria-label="Conversation"
        className={cn('h-full min-w-0 flex-1 md:flex', conversationId ? 'flex' : 'hidden')}
      >
        {conversationId ? (
          <ThreadPanel
            key={conversationId}
            conversationId={conversationId}
            initialListing={initialListing}
          />
        ) : (
          <ThreadEmpty
            title="Select a conversation"
            description="Pick a chat on the left, or message any business on Supporters to start one."
          />
        )}
      </section>
    </div>
  );
}
