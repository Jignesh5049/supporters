'use client';

import {
  type ListingRef,
  MEDIA_LIMITS,
  type SendMessageInput,
  TEXT_LIMITS,
  sendMessageSchema,
} from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { Textarea } from '@supporters/ui-web/components/textarea';
import { FileText, Image as ImageIcon, Loader2, Paperclip, Send, X } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useId, useRef, useState } from 'react';
import { UploadError } from '@/features/business/upload';
import { errorMessage } from '@/lib/api/errors';
import { type ChatFiles, pickChatFiles, uploadChatFiles } from './chat-upload';

export interface ListingDraft extends ListingRef {
  title: string;
}

interface ComposerProps {
  peerName: string;
  isDisabled: boolean;
  disabledReason?: string;
  /** A listing card to send with the next message (from a product page, or the owner's picker). */
  listing: ListingDraft | null;
  onClearListing: () => void;
  onSend: (input: SendMessageInput) => void;
  onTyping: (isTyping: boolean) => void;
  /** Extra controls next to the attach button (the owner's listing picker). */
  extra?: React.ReactNode;
}

const ACCEPT = [...MEDIA_LIMITS.imageTypes, ...MEDIA_LIMITS.documentTypes].join(',');

/**
 * Writes a message: text, up to 5 photos or one PDF (uploaded through presign
 * with purpose `chat`), or a listing card. Enter sends; Shift+Enter is a new line.
 * Every send is checked with the shared `sendMessageSchema` first.
 */
export function Composer({
  peerName,
  isDisabled,
  disabledReason,
  listing,
  onClearListing,
  onSend,
  onTyping,
  extra,
}: ComposerProps) {
  const [text, setText] = useState('');
  const [files, setFiles] = useState<ChatFiles | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const errorId = useId();

  const canSend = !isDisabled && !isUploading && (text.trim().length > 0 || files || listing);

  function handlePick(list: FileList | null) {
    setError(null);
    if (!list || list.length === 0) return;
    try {
      setFiles(pickChatFiles([...list]));
    } catch (cause) {
      setError(cause instanceof UploadError ? cause.message : 'Those files can’t be sent.');
    }
  }

  async function handleSubmit(event?: FormEvent) {
    event?.preventDefault();
    if (!canSend) return;
    setError(null);
    const body = text.trim();
    let draft: unknown;
    if (files) {
      setUploading(true);
      try {
        const attachmentIds = await uploadChatFiles(files);
        draft = { type: files.type, body, attachmentIds };
      } catch (cause) {
        setError(cause instanceof UploadError ? cause.message : errorMessage(cause));
        return;
      } finally {
        setUploading(false);
      }
    } else if (listing) {
      draft = { type: 'listing_card', body, listing: { type: listing.type, id: listing.id } };
    } else {
      draft = { type: 'text', body };
    }
    const parsed = sendMessageSchema.safeParse(draft);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'This message can’t be sent.');
      return;
    }
    onSend(parsed.data);
    onTyping(false);
    setText('');
    setFiles(null);
    if (listing) onClearListing();
    if (fileInput.current) fileInput.current.value = '';
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  if (isDisabled) {
    return (
      <p className="border-t border-border bg-card p-4 text-center text-caption text-muted-foreground">
        {disabledReason ?? 'You can’t send messages here.'}
      </p>
    );
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-2 border-t border-border bg-card p-3"
      aria-label={`Message ${peerName}`}
    >
      {(files || listing) && (
        <div className="flex flex-wrap gap-2">
          {listing && (
            <Chip
              label={`Listing: ${listing.title}`}
              onRemove={onClearListing}
              icon={<FileText aria-hidden className="size-3.5" />}
            />
          )}
          {files && (
            <Chip
              label={
                files.type === 'file'
                  ? `PDF: ${files.files[0].name}`
                  : `${files.files.length} ${files.files.length === 1 ? 'photo' : 'photos'}`
              }
              icon={
                files.type === 'file' ? (
                  <FileText aria-hidden className="size-3.5" />
                ) : (
                  <ImageIcon aria-hidden className="size-3.5" />
                )
              }
              onRemove={() => {
                setFiles(null);
                if (fileInput.current) fileInput.current.value = '';
              }}
            />
          )}
        </div>
      )}
      <div className="flex items-end gap-2">
        <input
          ref={fileInput}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-label="Attach photos or a PDF"
          onChange={(event) => handlePick(event.target.files)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Attach photos or a PDF"
          disabled={isUploading}
          onClick={() => fileInput.current?.click()}
        >
          <Paperclip aria-hidden />
        </Button>
        {extra}
        <Textarea
          aria-label={`Message to ${peerName}`}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          placeholder={files || listing ? 'Add a caption (optional)' : `Message ${peerName}`}
          value={text}
          rows={1}
          maxLength={TEXT_LIMITS.message.max}
          onChange={(event) => {
            setText(event.target.value);
            onTyping(event.target.value.trim().length > 0);
          }}
          onBlur={() => onTyping(false)}
          onKeyDown={handleKeyDown}
          className="max-h-40 min-h-9 flex-1 resize-none"
        />
        <Button type="submit" size="icon" aria-label="Send" disabled={!canSend}>
          {isUploading ? <Loader2 aria-hidden className="animate-spin" /> : <Send aria-hidden />}
        </Button>
      </div>
      <p id={errorId} role="alert" className="text-caption text-destructive empty:hidden">
        {error}
      </p>
    </form>
  );
}

function Chip({
  label,
  icon,
  onRemove,
}: {
  label: string;
  icon: React.ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-muted py-0.5 pr-0.5 pl-2.5 text-caption text-foreground">
      {icon}
      <span className="truncate">{label}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={`Remove ${label}`}
        onClick={onRemove}
      >
        <X aria-hidden />
      </Button>
    </span>
  );
}
