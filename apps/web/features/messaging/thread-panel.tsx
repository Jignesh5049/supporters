'use client';

import type { Conversation } from '@supporters/shared';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@supporters/ui-web/components/alert-dialog';
import { Button } from '@supporters/ui-web/components/button';
import { Skeleton } from '@supporters/ui-web/components/skeleton';
import {
  Ban,
  BadgeCheck,
  Bell,
  BellOff,
  ChevronLeft,
  Eye,
  EyeOff,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { BusinessLogo } from '@/components/catalog/business-logo';
import { useApp } from '@/context/AppContext';
import { errorMessage } from '@/lib/api/errors';
import { peerOf, peerUserIdOf } from './chat-mappers';
import { Composer, type ListingDraft } from './composer';
import { MessageBubble } from './message-bubble';
import {
  useConversation,
  useDeleteMessage,
  useDiscardMessage,
  useMarkRead,
  usePeerOnline,
  usePeerTyping,
  useRetryMessage,
  useSendMessage,
  useSetBlocked,
  useThread,
  useTypingNotifier,
  useUpdateConversation,
} from './use-chat';

interface ThreadPanelProps {
  conversationId: string;
  /** A listing card to offer in the composer (from "Message" on a product or service page). */
  initialListing: ListingDraft | null;
}

export function ThreadPanel({ conversationId, initialListing }: ThreadPanelProps) {
  const conversation = useConversation(conversationId);
  if (conversation.isPending) return <ThreadSkeleton />;
  if (conversation.isError) {
    return (
      <p role="alert" className="m-auto p-8 text-center text-caption text-destructive">
        {errorMessage(conversation.error)}
      </p>
    );
  }
  if (!conversation.data) {
    return (
      <ThreadEmpty
        title="Conversation not found"
        description="It may have been removed, or you are not part of it."
      />
    );
  }
  return (
    <Thread
      key={conversation.data.id}
      conversation={conversation.data}
      initialListing={initialListing}
    />
  );
}

function Thread({
  conversation,
  initialListing,
}: {
  conversation: Conversation;
  initialListing: ListingDraft | null;
}) {
  const peer = peerOf(conversation);
  const thread = useThread(conversation);
  const send = useSendMessage(conversation.id);
  const retry = useRetryMessage();
  const discard = useDiscardMessage();
  const notifyTyping = useTypingNotifier(conversation.id);
  const isPeerTyping = usePeerTyping(conversation.id);
  const isPeerOnline = usePeerOnline(conversation);
  const deleteMessage = useDeleteMessage(conversation.id);
  const { showToast } = useApp();
  const [listing, setListing] = useState(initialListing);
  const [isBlocked, setBlocked] = useState(false);
  useMarkRead(conversation, thread.messages);

  const refusedByBlock = thread.views.some(
    (view) => view.delivery === 'failed' && view.error?.startsWith('You can’t message'),
  );

  const status = isPeerTyping ? 'typing…' : isPeerOnline ? 'Online' : peer.subtitle;

  return (
    <div className="flex h-full min-w-0 flex-1 flex-col bg-muted">
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card p-3 sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <Button asChild variant="ghost" size="icon-sm" className="md:hidden">
            <Link href="/messages" aria-label="Back to conversations">
              <ChevronLeft aria-hidden />
            </Link>
          </Button>
          <span className="relative shrink-0">
            <BusinessLogo name={peer.name} url={peer.avatarUrl} />
            {isPeerOnline && (
              <span
                aria-hidden
                className="absolute right-0 bottom-0 size-2.5 rounded-full bg-success ring-2 ring-card"
              />
            )}
          </span>
          <div className="min-w-0">
            <h2 className="flex items-center gap-1 text-body-sm font-bold text-foreground">
              {peer.href ? (
                <Link href={peer.href} className="truncate hover:underline">
                  {peer.name}
                </Link>
              ) : (
                <span className="truncate">{peer.name}</span>
              )}
              {peer.isVerified && (
                <BadgeCheck aria-label="Verified" className="size-3.5 shrink-0 text-highlight" />
              )}
            </h2>
            <p aria-live="polite" className="truncate text-caption text-muted-foreground">
              {status}
            </p>
          </div>
        </div>
        <ThreadActions
          conversation={conversation}
          peerName={peer.name}
          peerUserId={peerUserIdOf(conversation, thread.messages)}
          isBlocked={isBlocked}
          onBlockedChange={setBlocked}
        />
      </header>

      <MessageList
        thread={thread}
        isPeerTyping={isPeerTyping}
        peerName={peer.name}
        onDelete={(messageId) =>
          deleteMessage.mutate(messageId, {
            onError: (error) => showToast(errorMessage(error), 'error'),
          })
        }
        onRetry={retry}
        onDiscard={discard}
      />

      <Composer
        peerName={peer.name}
        isDisabled={isBlocked || refusedByBlock}
        disabledReason={
          isBlocked
            ? `You blocked ${peer.name}. Unblock them to send messages.`
            : 'You can’t reply to this conversation.'
        }
        listing={listing}
        onClearListing={() => setListing(null)}
        onSend={send}
        onTyping={notifyTyping}
      />
    </div>
  );
}

function MessageList({
  thread,
  isPeerTyping,
  peerName,
  onDelete,
  onRetry,
  onDiscard,
}: {
  thread: ReturnType<typeof useThread>;
  isPeerTyping: boolean;
  peerName: string;
  onDelete: (messageId: string) => void;
  onRetry: (clientId: string) => void;
  onDiscard: (clientId: string) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const isNearBottom = useRef(true);
  const newestKey = thread.views.at(-1)?.key;
  const previousHeight = useRef(0);
  const oldestKey = thread.views[0]?.key;

  // Stay at the bottom as messages arrive, unless the user scrolled up to read.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (element && isNearBottom.current) element.scrollTop = element.scrollHeight;
  }, [newestKey, isPeerTyping]);

  // Keep the reading position when older history loads above.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (!element) return;
    if (previousHeight.current && !isNearBottom.current) {
      element.scrollTop += element.scrollHeight - previousHeight.current;
    }
    previousHeight.current = element.scrollHeight;
  }, [oldestKey]);

  useEffect(() => {
    previousHeight.current = scroller.current?.scrollHeight ?? 0;
  });

  if (thread.isPending) return <div className="flex-1" aria-busy="true" />;

  return (
    <div
      ref={scroller}
      onScroll={(event) => {
        const element = event.currentTarget;
        isNearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
      }}
      className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6"
    >
      {thread.isError && (
        <p role="alert" className="text-center text-caption text-destructive">
          {errorMessage(thread.error)}
        </p>
      )}
      {thread.hasNextPage ? (
        <div className="text-center">
          <Button
            type="button"
            variant="outline"
            size="xs"
            disabled={thread.isFetchingNextPage}
            onClick={() => void thread.fetchNextPage()}
          >
            {thread.isFetchingNextPage ? 'Loading…' : 'Load earlier messages'}
          </Button>
        </div>
      ) : (
        <p className="text-center text-caption text-muted-foreground">
          This is the start of your conversation with {peerName}.
        </p>
      )}
      <div role="log" aria-label={`Conversation with ${peerName}`} className="space-y-3">
        {thread.views.map((view) => (
          <MessageBubble
            key={view.key}
            message={view}
            onDelete={onDelete}
            onRetry={onRetry}
            onDiscard={onDiscard}
          />
        ))}
      </div>
      {isPeerTyping && (
        <p className="text-caption text-muted-foreground italic">{peerName} is typing…</p>
      )}
    </div>
  );
}

function ThreadActions({
  conversation,
  peerName,
  peerUserId,
  isBlocked,
  onBlockedChange,
}: {
  conversation: Conversation;
  peerName: string;
  peerUserId: string | null;
  isBlocked: boolean;
  onBlockedChange: (isBlocked: boolean) => void;
}) {
  const update = useUpdateConversation(conversation.id);
  const block = useSetBlocked(conversation.id);
  const { showToast } = useApp();
  const onError = (error: unknown) => showToast(errorMessage(error), 'error');

  function handleBlock(next: boolean) {
    if (!peerUserId) return;
    block.mutate(
      { userId: peerUserId, isBlocked: next },
      {
        onSuccess: (state) => {
          onBlockedChange(state.isBlocked);
          showToast(
            state.isBlocked ? `You blocked ${peerName}.` : `You unblocked ${peerName}.`,
            'info',
          );
        },
        onError,
      },
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={conversation.muted ? 'Unmute' : 'Mute'}
        title={conversation.muted ? 'Unmute notifications' : 'Mute notifications'}
        aria-pressed={conversation.muted}
        disabled={update.isPending}
        onClick={() => update.mutate({ muted: !conversation.muted }, { onError })}
      >
        {conversation.muted ? <BellOff aria-hidden /> : <Bell aria-hidden />}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={conversation.hidden ? 'Unhide' : 'Hide'}
        title={conversation.hidden ? 'Show in your inbox again' : 'Hide from your inbox'}
        disabled={update.isPending}
        onClick={() =>
          update.mutate(
            { hidden: !conversation.hidden },
            {
              onSuccess: (next) =>
                showToast(
                  next.hidden ? 'Hidden. A new message brings it back.' : 'Back in your inbox.',
                  'info',
                ),
              onError,
            },
          )
        }
      >
        {conversation.hidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
      </Button>
      {isBlocked ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={block.isPending}
          onClick={() => handleBlock(false)}
        >
          Unblock
        </Button>
      ) : (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Block"
              title={peerUserId ? `Block ${peerName}` : 'You can block once they reply'}
              disabled={!peerUserId || block.isPending}
            >
              <Ban aria-hidden />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Block {peerName}?</AlertDialogTitle>
              <AlertDialogDescription>
                Neither of you can send new messages or enquiries, and this chat leaves your inbox.
                Earlier messages stay readable. You can unblock from here.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleBlock(true)}>Block</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

/** The right pane when no thread is open, or the thread can't be shown. */
export function ThreadEmpty({ title, description }: { title: string; description: string }) {
  return (
    <div className="m-auto flex max-w-sm flex-col items-center gap-3 p-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl border border-border bg-card text-primary">
        <MessageSquare aria-hidden className="size-7" />
      </span>
      <h2 className="text-body font-bold text-foreground">{title}</h2>
      <p className="text-caption text-muted-foreground">{description}</p>
    </div>
  );
}

function ThreadSkeleton() {
  return (
    <div aria-busy="true" className="flex h-full flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-border bg-card p-4">
        <Skeleton className="size-10 rounded-xl" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="flex-1 bg-muted" />
    </div>
  );
}
