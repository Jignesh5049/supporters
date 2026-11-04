'use client';

import type { Post, PostStatus } from '@supporters/shared';
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
import { useMutation } from '@tanstack/react-query';
import { Archive, ArchiveRestore, Pencil, Send, Trash2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { errorMessage } from '@/lib/api/errors';
import { deletePost, updatePost } from './hub-posts-api';
import { POST_TYPE_LABELS, formatPostTime, postPath } from './post-mappers';

const FILTERS: { label: string; status: PostStatus | null }[] = [
  { label: 'All', status: null },
  { label: 'Published', status: 'published' },
  { label: 'Drafts', status: 'draft' },
  { label: 'Archived', status: 'archived' },
];

const STATUS_LABELS: Record<PostStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

/** The owner's posts with a status filter (in the URL) and per-post actions. */
export function HubPostList({ posts, hasMore }: { posts: Post[]; hasMore: boolean }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const filter = params.get('status');
  const shown = filter ? posts.filter((post) => post.status === filter) : posts;

  return (
    <div className="space-y-4">
      <nav aria-label="Post status" className="flex gap-1 border-b border-border">
        {FILTERS.map(({ label, status }) => (
          <Link
            key={label}
            href={status ? `${pathname}?status=${status}` : pathname}
            aria-current={status === filter ? 'page' : undefined}
            className={cn(
              'border-b-2 px-4 py-2 text-caption font-bold',
              status === filter
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      {shown.length === 0 ? (
        <p className="py-8 text-center text-body-sm text-muted-foreground">
          {filter ? `No ${filter} posts.` : 'No posts yet.'}
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {shown.map((post) => (
            <li key={post.id}>
              <HubPostRow post={post} />
            </li>
          ))}
        </ul>
      )}
      {hasMore && (
        <p className="text-caption text-muted-foreground">
          Showing the newest {posts.length}. Paging through the rest comes next.
        </p>
      )}
    </div>
  );
}

function HubPostRow({ post }: { post: Post }) {
  const router = useRouter();
  const { showToast } = useApp();
  const change = useMutation({
    mutationFn: (status: PostStatus) => updatePost(post.id, { status }),
    onSuccess: () => router.refresh(),
    onError: (error) => showToast(errorMessage(error), 'error'),
  });
  const remove = useMutation({
    mutationFn: () => deletePost(post.id),
    onSuccess: () => {
      showToast('Post deleted.', 'success');
      router.refresh();
    },
    onError: (error) => showToast(errorMessage(error), 'error'),
  });
  const cover = post.media[0];
  const title = post.body.split('\n')[0]?.trim() || `${POST_TYPE_LABELS[post.type]} post`;

  return (
    <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
      <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted">
        {cover?.kind === 'image' && (
          <Image src={cover.url} alt="" fill className="object-cover" unoptimized />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-1 text-body-sm font-bold text-foreground">{title}</p>
        <p className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
          <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
            {STATUS_LABELS[post.status]}
          </Badge>
          <span>{POST_TYPE_LABELS[post.type]}</span>
          <span>
            {post.likeCount} likes · {post.commentCount} comments
          </span>
          {post.publishedAt && (
            <time dateTime={post.publishedAt}>{formatPostTime(post.publishedAt)}</time>
          )}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {post.status === 'published' && (
          <Button asChild variant="ghost" size="sm">
            <Link href={postPath(post.id)} aria-label={`View post: ${title}`}>
              View
            </Link>
          </Button>
        )}
        <Button asChild variant="ghost" size="sm">
          <Link href={`/business/posts/${post.id}/edit`} aria-label={`Edit post: ${title}`}>
            <Pencil aria-hidden />
            Edit
          </Link>
        </Button>
        {post.status === 'draft' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={change.isPending}
            onClick={() => change.mutate('published')}
          >
            <Send aria-hidden />
            Publish
          </Button>
        )}
        {post.status === 'published' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={change.isPending}
            onClick={() => change.mutate('archived')}
            aria-label={`Archive post: ${title}`}
          >
            <Archive aria-hidden />
            Archive
          </Button>
        )}
        {post.status === 'archived' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={change.isPending}
            onClick={() => change.mutate('published')}
          >
            <ArchiveRestore aria-hidden />
            Unarchive
          </Button>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive"
              aria-label={`Delete post: ${title}`}
            >
              <Trash2 aria-hidden />
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this post?</AlertDialogTitle>
              <AlertDialogDescription>
                It disappears from feeds and your page. Deleted posts still count toward the weekly
                limit.
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
      </div>
    </div>
  );
}
