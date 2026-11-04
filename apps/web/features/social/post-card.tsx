'use client';

import type { Post } from '@supporters/shared';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { Card } from '@supporters/ui-web/components/card';
import { cn } from '@supporters/ui-web/lib/utils';
import {
  BadgeCheck,
  Bookmark,
  Clock,
  Heart,
  MapPin,
  MessageSquare,
  Send,
  Share2,
  Tag,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BusinessLogo } from '@/components/catalog/business-logo';
import { ShareModal } from '@/components/common/ShareModal';
import { useApp } from '@/context/AppContext';
import { loginUrlFor } from '@/lib/auth/session-cookies';
import { type PostView, countLabel, toPostView } from './post-mappers';
import { useLikePost, useSavePost } from './use-social-actions';

interface PostCardProps {
  post: Post;
  isSignedIn: boolean;
  /** On the post's own page the body isn't clamped and the comment link isn't needed. */
  variant?: 'feed' | 'detail';
}

/** A business post: header, offer tag, text, media, attached listing, and the social bar. */
export function PostCard({ post, isSignedIn, variant = 'feed' }: PostCardProps) {
  const view = toPostView(post);
  const pathname = usePathname();
  const like = useLikePost();
  const save = useSavePost();
  const [isShareOpen, setShareOpen] = useState(false);
  const loginHref = loginUrlFor(pathname);

  return (
    <Card
      role="article"
      className="gap-0 overflow-hidden py-0"
      aria-labelledby={`post-${post.id}-by`}
    >
      <header className="flex items-start gap-3 p-4 pb-3 sm:px-5">
        <Link href={view.business.href} tabIndex={-1} aria-hidden>
          <BusinessLogo name={view.business.name} url={view.business.logoUrl} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5">
            <Link
              id={`post-${post.id}-by`}
              href={view.business.href}
              className="truncate text-body-sm font-bold text-foreground hover:text-primary"
            >
              {view.business.name}
            </Link>
            {view.business.isVerified && (
              <BadgeCheck className="size-4 text-highlight" aria-label="Verified" />
            )}
            <Badge variant="outline" className="text-caption">
              {view.typeLabel}
            </Badge>
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="size-3" aria-hidden />
              {view.business.city}
            </span>
            {view.publishedLabel && view.publishedAt && (
              <Link href={view.href} className="flex items-center gap-1 hover:text-foreground">
                <Clock className="size-3" aria-hidden />
                <time dateTime={view.publishedAt}>{view.publishedLabel}</time>
              </Link>
            )}
          </p>
        </div>
      </header>

      {view.offer && (
        <p className="mx-4 mb-2.5 flex flex-wrap items-center gap-2 sm:mx-5">
          <Badge className="bg-highlight-soft text-highlight">
            <Tag aria-hidden />
            {view.offer.tag}
          </Badge>
          {view.offer.endsLabel && (
            <span className="text-caption text-muted-foreground">
              {view.offer.isEnded ? 'Ended' : 'Ends'} {view.offer.endsLabel}
            </span>
          )}
        </p>
      )}

      {view.body && (
        <p
          className={cn(
            'px-4 pb-3 text-body-sm whitespace-pre-line text-foreground sm:px-5',
            variant === 'feed' && 'line-clamp-6',
          )}
        >
          {view.body}
        </p>
      )}

      <PostMedia view={view} />

      {view.attachment && <AttachmentCard view={view} />}

      <div className="flex items-center justify-between border-t border-border px-4 py-2 text-caption text-muted-foreground sm:px-5">
        <span>{countLabel(post.likeCount, 'like')}</span>
        {variant === 'feed' ? (
          <Link href={view.href} className="hover:text-foreground">
            {countLabel(post.commentCount, 'comment')}
          </Link>
        ) : (
          <span>{countLabel(post.commentCount, 'comment')}</span>
        )}
      </div>

      <div className="grid grid-cols-4 border-t border-border px-2 py-1.5 sm:px-4">
        {isSignedIn ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={post.isLiked}
            onClick={() => like.mutate({ postId: post.id, isLiked: !post.isLiked })}
            className={cn(post.isLiked && 'text-destructive')}
          >
            <Heart className={cn(post.isLiked && 'fill-current')} aria-hidden />
            {post.isLiked ? 'Liked' : 'Like'}
          </Button>
        ) : (
          <Button asChild variant="ghost" size="sm">
            <Link href={loginHref}>
              <Heart aria-hidden />
              Like
            </Link>
          </Button>
        )}
        <Button asChild variant="ghost" size="sm">
          <Link href={variant === 'feed' ? view.href : '#comments'}>
            <MessageSquare aria-hidden />
            Comment
          </Link>
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setShareOpen(true)}>
          <Share2 aria-hidden />
          Share
        </Button>
        {isSignedIn ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={post.isSaved}
            onClick={() => save.mutate({ postId: post.id, isSaved: !post.isSaved })}
            className={cn(post.isSaved && 'text-primary')}
          >
            <Bookmark className={cn(post.isSaved && 'fill-current')} aria-hidden />
            {post.isSaved ? 'Saved' : 'Save'}
          </Button>
        ) : (
          <Button asChild variant="ghost" size="sm">
            <Link href={loginHref}>
              <Bookmark aria-hidden />
              Save
            </Link>
          </Button>
        )}
      </div>

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setShareOpen(false)}
        title={`${view.business.name} on Supporters`}
        url={typeof window === 'undefined' ? undefined : `${window.location.origin}${view.href}`}
      />
    </Card>
  );
}

function PostMedia({ view }: { view: PostView }) {
  if (!view.media) return null;
  if (view.media.kind === 'video') {
    return (
      <div className="flex justify-center border-y border-border bg-foreground">
        <video
          src={view.media.url}
          controls
          preload="metadata"
          playsInline
          className="max-h-128 w-full"
          aria-label={`Video from ${view.business.name}`}
        />
      </div>
    );
  }
  const urls = view.media.urls;
  const shown = urls.slice(0, 4);
  return (
    <div
      className={cn(
        'grid gap-0.5 border-y border-border bg-muted',
        shown.length > 1 ? 'grid-cols-2' : 'grid-cols-1',
      )}
    >
      {shown.map((url, index) => (
        <div
          key={url}
          className={cn(
            'relative bg-muted',
            shown.length === 1 ? 'aspect-video' : 'aspect-square',
            shown.length === 3 && index === 0 && 'col-span-2 aspect-video',
          )}
        >
          <Image
            src={url}
            alt={`Image ${index + 1} of ${urls.length} from ${view.business.name}`}
            fill
            sizes="(min-width: 768px) 640px, 100vw"
            className="object-cover"
            unoptimized
          />
          {index === shown.length - 1 && urls.length > shown.length && (
            <span className="absolute inset-0 flex items-center justify-center bg-foreground/60 text-title font-bold text-background">
              +{urls.length - shown.length}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function AttachmentCard({ view }: { view: PostView }) {
  const { openEnquiryModal } = useApp();
  const attachment = view.attachment;
  if (!attachment) return null;
  return (
    <div className="m-4 flex flex-col justify-between gap-3 rounded-xl border border-border bg-muted p-3.5 sm:m-5 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-center gap-3">
        {attachment.imageUrl && (
          <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border bg-card">
            <Image src={attachment.imageUrl} alt="" fill className="object-cover" unoptimized />
          </div>
        )}
        <div className="min-w-0">
          <p className="line-clamp-1 text-caption font-bold text-foreground">{attachment.title}</p>
          <p className="text-caption font-extrabold text-primary">{attachment.priceText}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={attachment.href}>
            {attachment.kind === 'product' ? 'View product' : 'View service'}
          </Link>
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() =>
            openEnquiryModal({
              title: attachment.title,
              businessName: view.business.name,
              businessId: view.business.id,
            })
          }
        >
          <Send aria-hidden />
          Contact supplier
        </Button>
      </div>
    </div>
  );
}
