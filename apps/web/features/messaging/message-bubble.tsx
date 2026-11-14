'use client';

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
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { cn } from '@supporters/ui-web/lib/utils';
import {
  AlertCircle,
  BadgeIndianRupee,
  Check,
  CheckCheck,
  Clock,
  FileText,
  FileQuestion,
  RotateCw,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import type { ListingCardView, MessageView } from './chat-mappers';
import { UGC_LINK_REL, linkify } from './linkify';

interface MessageBubbleProps {
  message: MessageView;
  onDelete: (messageId: string) => void;
  onRetry: (clientId: string) => void;
  onDiscard: (clientId: string) => void;
}

const DELIVERY_LABELS = {
  sending: 'Sending',
  sent: 'Sent',
  read: 'Read',
  failed: 'Not sent',
} as const;

export function MessageBubble({ message, onDelete, onRetry, onDiscard }: MessageBubbleProps) {
  const isMine = message.isMine;
  const isEnquiry = message.type === 'enquiry' || message.type === 'quote';
  return (
    <div
      role="article"
      aria-label={isMine ? 'Your message' : 'Their message'}
      className={cn('group flex items-end gap-1', isMine ? 'flex-row-reverse' : 'flex-row')}
    >
      <div
        className={cn(
          'max-w-4/5 space-y-2 rounded-2xl p-3 text-body-sm shadow-xs sm:max-w-md',
          isEnquiry
            ? 'border border-highlight bg-highlight-soft text-foreground'
            : isMine
              ? 'rounded-br-sm bg-primary text-primary-foreground'
              : 'rounded-bl-sm border border-border bg-card text-foreground',
        )}
      >
        {message.type === 'enquiry' && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-highlight text-highlight-foreground">
              <FileQuestion aria-hidden />
              Enquiry
            </Badge>
            {message.enquiry && (
              <span className="text-caption text-muted-foreground">
                {message.enquiry.statusLabel}
                {message.enquiry.quantityText && ` · Qty ${message.enquiry.quantityText}`}
              </span>
            )}
          </div>
        )}
        {message.quote && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-highlight text-highlight-foreground">
              <BadgeIndianRupee aria-hidden />
              Quote
            </Badge>
            <span className="font-bold text-foreground">{message.quote.priceText}</span>
            <Link
              href={message.quote.requirementHref}
              className="text-caption text-muted-foreground underline underline-offset-2"
            >
              View requirement
            </Link>
          </div>
        )}
        {message.listing && (
          <ListingCard listing={message.listing} isOnPrimary={isMine && !isEnquiry} />
        )}
        <Attachments message={message} />
        {message.body && (
          <p className="break-words whitespace-pre-line">
            {linkify(message.body).map((part, index) =>
              part.kind === 'link' ? (
                <a
                  key={index}
                  href={part.href}
                  target="_blank"
                  rel={UGC_LINK_REL}
                  className="underline underline-offset-2"
                >
                  {part.text}
                </a>
              ) : (
                <span key={index}>{part.text}</span>
              ),
            )}
          </p>
        )}
        <div
          className={cn(
            'flex items-center justify-end gap-1 text-caption',
            isMine && !isEnquiry ? 'text-primary-foreground/75' : 'text-muted-foreground',
          )}
        >
          <time dateTime={message.createdAt}>{message.time}</time>
          {message.delivery && <DeliveryIcon state={message.delivery} />}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-center gap-1">
        {message.delivery === 'failed' && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Retry sending"
              onClick={() => onRetry(message.clientId)}
            >
              <RotateCw aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label="Discard unsent message"
              onClick={() => onDiscard(message.clientId)}
            >
              <Trash2 aria-hidden />
            </Button>
          </>
        )}
        {message.id && message.delivery !== 'sending' && message.delivery !== 'failed' && (
          <DeleteForMe onConfirm={() => message.id && onDelete(message.id)} />
        )}
      </div>
      {message.error && (
        <p role="alert" className="self-center text-caption text-destructive">
          {message.error}
        </p>
      )}
    </div>
  );
}

function DeliveryIcon({ state }: { state: MessageView['delivery'] & string }) {
  const label = DELIVERY_LABELS[state];
  const Icon =
    state === 'read'
      ? CheckCheck
      : state === 'sent'
        ? Check
        : state === 'failed'
          ? AlertCircle
          : Clock;
  return <Icon role="img" aria-label={label} className="size-3.5" />;
}

function Attachments({ message }: { message: MessageView }) {
  if (message.attachments.length === 0) return null;
  const images = message.attachments.filter((attachment) => attachment.isImage);
  const files = message.attachments.filter((attachment) => !attachment.isImage);
  return (
    <div className="space-y-2">
      {images.length > 0 && (
        <div
          className={cn(
            'grid w-56 max-w-full gap-1',
            images.length > 1 ? 'grid-cols-2' : 'grid-cols-1',
          )}
        >
          {images.map((image, index) => (
            // The API answers members with a redirect to a short-lived signed URL.
            <a
              key={image.id}
              href={image.href}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block aspect-square overflow-hidden rounded-lg bg-muted"
            >
              <Image
                src={image.href}
                alt={`Photo ${index + 1} of ${images.length}`}
                fill
                unoptimized
                sizes="(min-width: 640px) 224px, 40vw"
                className="object-cover"
              />
            </a>
          ))}
        </div>
      )}
      {files.map((file) => (
        <a
          key={file.id}
          href={file.href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg border border-border bg-card p-2 text-caption font-semibold text-foreground hover:bg-muted"
        >
          <FileText aria-hidden className="size-5 shrink-0 text-primary" />
          <span>{file.label}</span>
        </a>
      ))}
    </div>
  );
}

function ListingCard({ listing, isOnPrimary }: { listing: ListingCardView; isOnPrimary: boolean }) {
  return (
    <Link
      href={listing.href}
      className={cn(
        'flex items-center gap-2.5 rounded-xl border p-2',
        isOnPrimary ? 'border-primary-foreground/25 bg-primary-hover' : 'border-border bg-card',
      )}
    >
      <span className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {listing.imageUrl && (
          <Image
            src={listing.imageUrl}
            alt=""
            fill
            unoptimized
            sizes="48px"
            className="object-cover"
          />
        )}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            'line-clamp-1 text-caption font-bold',
            isOnPrimary ? '' : 'text-foreground',
          )}
        >
          {listing.title}
        </span>
        <span
          className={cn(
            'text-caption font-semibold',
            isOnPrimary ? 'text-primary-foreground/80' : 'text-primary',
          )}
        >
          {listing.priceText}
        </span>
      </span>
    </Link>
  );
}

function DeleteForMe({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label="Delete for me"
          className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
        >
          <Trash2 aria-hidden />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this message for you?</AlertDialogTitle>
          <AlertDialogDescription>
            It disappears from your copy of the chat. The other person still sees it.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete for me</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
