'use client';

import { type Comment, type Page, TEXT_LIMITS, createCommentSchema } from '@supporters/shared';
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
import { Avatar, AvatarFallback } from '@supporters/ui-web/components/avatar';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { Label } from '@supporters/ui-web/components/label';
import { Textarea } from '@supporters/ui-web/components/textarea';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type FormEvent, useId, useState } from 'react';
import { FormError } from '@/features/auth/form-field';
import { useApp } from '@/context/AppContext';
import { loginUrlFor } from '@/lib/auth/session-cookies';
import { errorMessage } from '@/lib/api/errors';
import { initials } from '@/lib/catalog/format';
import {
  type CommentPages,
  adjustReplyCount,
  canDeleteComment,
  prependComment,
  removeComment,
  removedByDelete,
} from './comment-cache';
import { socialKeys, updatePostEverywhere } from './post-cache';
import { countLabel, formatPostTime } from './post-mappers';
import { socialApi } from './social-api';
import { cursorListOptions, flattenPages } from './use-feed';

export interface CommentViewer {
  /** Null for guests. */
  userId: string | null;
  /** The viewer owns the post's business, so may delete any comment on it. */
  isPostOwner: boolean;
}

interface CommentsProps {
  postId: string;
  initialPage: Page<Comment>;
  viewer: CommentViewer;
}

const commentsOptions = (postId: string, parentId: string | null, initialPage?: Page<Comment>) =>
  cursorListOptions(
    socialKeys.comments(postId, parentId),
    (cursor) => socialApi.comments(postId, parentId ?? undefined, cursor),
    initialPage,
  );

/** Comments on a post: one level of replies, newest first. */
export function Comments({ postId, initialPage, viewer }: CommentsProps) {
  const pathname = usePathname();
  const comments = useInfiniteQuery(commentsOptions(postId, null, initialPage));
  const items = flattenPages(comments.data);

  return (
    <section id="comments" aria-labelledby="comments-title" className="space-y-4">
      <h2 id="comments-title" className="text-body font-bold text-foreground">
        Comments
      </h2>
      {viewer.userId ? (
        <CommentComposer postId={postId} parentId={null} />
      ) : (
        <p className="rounded-xl border border-border bg-card p-4 text-body-sm text-muted-foreground">
          <Link href={loginUrlFor(pathname)} className="font-semibold text-primary">
            Sign in
          </Link>{' '}
          to comment.
        </p>
      )}

      {items.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">
          No comments yet. Start the conversation.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((comment) => (
            <li key={comment.id}>
              <CommentItem comment={comment} viewer={viewer} />
            </li>
          ))}
        </ul>
      )}
      {comments.hasNextPage && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={comments.isFetchingNextPage}
          onClick={() => comments.fetchNextPage()}
        >
          {comments.isFetchingNextPage ? 'Loading…' : 'Show more comments'}
        </Button>
      )}
    </section>
  );
}

function CommentItem({ comment, viewer }: { comment: Comment; viewer: CommentViewer }) {
  const [isReplying, setReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const isTopLevel = comment.parentId === null;

  return (
    <article
      aria-label={`Comment by ${comment.author.name}`}
      className="flex gap-3 rounded-xl border border-border bg-card p-3.5"
    >
      <Avatar className="size-8">
        <AvatarFallback className="bg-primary-soft text-caption font-bold text-primary">
          {initials(comment.author.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="flex flex-wrap items-center gap-2 text-caption">
          <span className="font-bold text-foreground">{comment.author.name}</span>
          {comment.isByBusiness && <Badge variant="secondary">Business</Badge>}
          <time dateTime={comment.createdAt} className="text-muted-foreground">
            {formatPostTime(comment.createdAt)}
          </time>
        </p>
        <p className="text-body-sm break-words whitespace-pre-line text-foreground">
          {comment.body}
        </p>
        <div className="flex flex-wrap items-center gap-1">
          {isTopLevel && viewer.userId && (
            <Button type="button" variant="ghost" size="xs" onClick={() => setReplying((v) => !v)}>
              <MessageSquare aria-hidden />
              Reply
            </Button>
          )}
          {isTopLevel && comment.replyCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              aria-expanded={showReplies}
              onClick={() => setShowReplies((v) => !v)}
            >
              {showReplies
                ? 'Hide replies'
                : `View ${countLabel(comment.replyCount, 'reply', 'replies')}`}
            </Button>
          )}
          {canDeleteComment(comment, viewer) && <DeleteComment comment={comment} />}
        </div>
        {isReplying && (
          <CommentComposer
            postId={comment.postId}
            parentId={comment.id}
            onDone={() => {
              setReplying(false);
              setShowReplies(true);
            }}
          />
        )}
        {isTopLevel && showReplies && <Replies parent={comment} viewer={viewer} />}
      </div>
    </article>
  );
}

function Replies({ parent, viewer }: { parent: Comment; viewer: CommentViewer }) {
  const replies = useInfiniteQuery(commentsOptions(parent.postId, parent.id));
  const items = flattenPages(replies.data);
  if (replies.isPending) return <p className="text-caption text-muted-foreground">Loading…</p>;
  return (
    <div className="space-y-2 pt-1">
      <ul className="space-y-2">
        {items.map((reply) => (
          <li key={reply.id}>
            <CommentItem comment={reply} viewer={viewer} />
          </li>
        ))}
      </ul>
      {replies.hasNextPage && (
        <Button type="button" variant="ghost" size="xs" onClick={() => replies.fetchNextPage()}>
          Show more replies
        </Button>
      )}
    </div>
  );
}

function CommentComposer({
  postId,
  parentId,
  onDone,
}: {
  postId: string;
  parentId: string | null;
  onDone?: () => void;
}) {
  const client = useQueryClient();
  const id = useId();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: (input: { body: string; parentId?: string }) =>
      socialApi.createComment(postId, input),
    onSuccess: (comment) => {
      client.setQueryData<CommentPages>(socialKeys.comments(postId, parentId), (data) =>
        prependComment(data, comment),
      );
      if (parentId) {
        client.setQueryData<CommentPages>(socialKeys.comments(postId, null), (data) =>
          adjustReplyCount(data, parentId, 1),
        );
      }
      updatePostEverywhere(client, postId, (post) => ({
        ...post,
        commentCount: post.commentCount + 1,
      }));
      setBody('');
      onDone?.();
    },
    onError: (cause) => setError(errorMessage(cause)),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const input = createCommentSchema.safeParse({ body, parentId: parentId ?? undefined });
    if (!input.success) {
      setError('Write a comment first.');
      return;
    }
    create.mutate(input.data);
  }

  const label = parentId ? 'Write a reply' : 'Write a comment';
  return (
    <form onSubmit={handleSubmit} className="space-y-2" noValidate>
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <Textarea
        id={id}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={parentId ? 'Write a reply…' : 'Add a comment…'}
        rows={parentId ? 2 : 3}
        maxLength={TEXT_LIMITS.comment.max}
        aria-invalid={error ? true : undefined}
      />
      <div className="flex items-center justify-between gap-3">
        <FormError message={error} />
        <Button type="submit" size="sm" disabled={create.isPending} className="ml-auto">
          {create.isPending ? 'Posting…' : parentId ? 'Reply' : 'Comment'}
        </Button>
      </div>
    </form>
  );
}

function DeleteComment({ comment }: { comment: Comment }) {
  const client = useQueryClient();
  const { showToast } = useApp();
  const remove = useMutation({
    mutationFn: () => socialApi.deleteComment(comment.id),
    onSuccess: () => {
      client.setQueryData<CommentPages>(
        socialKeys.comments(comment.postId, comment.parentId),
        (data) => removeComment(data, comment.id),
      );
      if (comment.parentId) {
        client.setQueryData<CommentPages>(socialKeys.comments(comment.postId, null), (data) =>
          adjustReplyCount(data, comment.parentId as string, -1),
        );
      }
      updatePostEverywhere(client, comment.postId, (post) => ({
        ...post,
        commentCount: Math.max(0, post.commentCount - removedByDelete(comment)),
      }));
      showToast('Comment deleted.', 'success');
    },
    onError: (error) => showToast(errorMessage(error), 'error'),
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" size="xs" className="text-destructive">
          <Trash2 aria-hidden />
          Delete
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this comment?</AlertDialogTitle>
          <AlertDialogDescription>
            {comment.parentId === null && comment.replyCount > 0
              ? 'Its replies are deleted too. This can’t be undone.'
              : 'This can’t be undone.'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => remove.mutate()}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
