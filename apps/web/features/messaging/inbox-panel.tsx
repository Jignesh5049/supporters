'use client';

import { CHAT_LIMITS, type Conversation } from '@supporters/shared';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { Input } from '@supporters/ui-web/components/input';
import { Skeleton } from '@supporters/ui-web/components/skeleton';
import { cn } from '@supporters/ui-web/lib/utils';
import { BadgeCheck, BellOff, EyeOff, Search } from 'lucide-react';
import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import { BusinessLogo } from '@/components/catalog/business-logo';
import { flattenPages } from '@/features/social/use-feed';
import { errorMessage } from '@/lib/api/errors';
import { formatInboxTime, messagePreview, peerOf } from './chat-mappers';
import { useInbox } from './use-chat';

/** The conversation list: search by name, hidden threads on request, unread counts. */
export function InboxPanel({ activeId }: { activeId: string | null }) {
  const [search, setSearch] = useState('');
  const [isShowingHidden, setShowingHidden] = useState(false);
  const term = useDeferredValue(search.trim().slice(0, CHAT_LIMITS.searchQueryMax));
  const inbox = useInbox({ q: term || null, hidden: isShowingHidden });
  const conversations = useMemo(() => flattenPages(inbox.data), [inbox.data]);
  // Relative times ("Yesterday") as of the last fetch, so a render stays pure.
  const now = useMemo(() => new Date(inbox.dataUpdatedAt), [inbox.dataUpdatedAt]);

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-border p-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-body-lg font-bold text-foreground">
            {isShowingHidden ? 'Hidden chats' : 'Messages'}
          </h1>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            aria-pressed={isShowingHidden}
            onClick={() => setShowingHidden((value) => !value)}
          >
            <EyeOff aria-hidden />
            {isShowingHidden ? 'Back to inbox' : 'Hidden'}
          </Button>
        </div>
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            aria-label="Search conversations by name"
            placeholder="Search by name"
            value={search}
            maxLength={CHAT_LIMITS.searchQueryMax}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {inbox.isPending ? (
          <InboxSkeleton />
        ) : inbox.isError ? (
          <p role="alert" className="p-6 text-center text-caption text-destructive">
            {errorMessage(inbox.error)}
          </p>
        ) : conversations.length === 0 ? (
          <p className="p-8 text-center text-caption text-muted-foreground">
            {term
              ? 'No conversations match that name.'
              : isShowingHidden
                ? 'No hidden conversations.'
                : 'No conversations yet. Message a business or send an enquiry to start one.'}
          </p>
        ) : (
          <ul aria-label="Conversations" className="divide-y divide-border-subtle">
            {conversations.map((conversation) => (
              <li key={conversation.id}>
                <ConversationRow
                  conversation={conversation}
                  isActive={conversation.id === activeId}
                  now={now}
                />
              </li>
            ))}
          </ul>
        )}
        {inbox.hasNextPage && (
          <div className="p-3 text-center">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={inbox.isFetchingNextPage}
              onClick={() => void inbox.fetchNextPage()}
            >
              {inbox.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationRow({
  conversation,
  isActive,
  now,
}: {
  conversation: Conversation;
  isActive: boolean;
  now: Date;
}) {
  const peer = peerOf(conversation);
  const unread = conversation.unreadCount;
  return (
    <Link
      href={`/messages/${conversation.id}`}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-start gap-3 border-l-4 p-4 text-left transition-colors',
        isActive ? 'border-l-primary bg-muted' : 'border-l-transparent hover:bg-muted',
      )}
    >
      <BusinessLogo name={peer.name} url={peer.avatarUrl} className="size-11 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1">
            <span
              className={cn(
                'truncate text-body-sm text-foreground',
                unread > 0 ? 'font-bold' : 'font-semibold',
              )}
            >
              {peer.name}
            </span>
            {peer.isVerified && (
              <BadgeCheck aria-label="Verified" className="size-3.5 shrink-0 text-highlight" />
            )}
          </span>
          <time
            dateTime={conversation.lastMessageAt}
            className="shrink-0 text-caption text-muted-foreground"
          >
            {formatInboxTime(conversation.lastMessageAt, now)}
          </time>
        </div>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <p
            className={cn(
              'line-clamp-1 text-caption',
              unread > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground',
            )}
          >
            {messagePreview(conversation.lastMessage, conversation.side)}
          </p>
          <span className="flex shrink-0 items-center gap-1">
            {conversation.muted && (
              <BellOff aria-label="Muted" className="size-3.5 text-muted-foreground" />
            )}
            {unread > 0 && (
              <Badge aria-label={`${unread} unread`} className="min-w-5 justify-center px-1.5">
                {unread > 99 ? '99+' : unread}
              </Badge>
            )}
          </span>
        </div>
        {peer.subtitle && (
          <p className="mt-1 truncate text-caption text-muted-foreground">{peer.subtitle}</p>
        )}
      </div>
    </Link>
  );
}

function InboxSkeleton() {
  return (
    <div aria-hidden className="space-y-1 p-4">
      {[0, 1, 2, 3].map((n) => (
        <div key={n} className="flex items-center gap-3 py-2">
          <Skeleton className="size-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
