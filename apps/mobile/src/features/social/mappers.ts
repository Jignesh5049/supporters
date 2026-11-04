import type { Money, Post, PostMedia } from '@supporters/shared';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now", "5m", "3h", "2d", then a short date. */
export function formatTimeAgo(iso: string | null, now: Date = new Date()): string {
  if (!iso) return '';
  const then = new Date(iso);
  const diff = now.getTime() - then.getTime();
  if (Number.isNaN(diff)) return '';
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}d`;
  return then.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Amounts are integer paise; null means "Ask for price" (product spec, Decisions 14). */
export function formatPrice(price: Money | null): string {
  if (!price) return 'Ask for price';
  const rupees = price.amountPaise / 100;
  const hasPaise = price.amountPaise % 100 !== 0;
  return `₹${rupees.toLocaleString('en-IN', {
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

/** "1 like", "2,500 likes". */
export function formatCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString('en-IN')} ${count === 1 ? singular : plural}`;
}

export interface PostCardModel {
  id: string;
  businessSlug: string;
  businessName: string;
  businessLogoUrl: string | undefined;
  isVerified: boolean;
  city: string;
  timeAgo: string;
  body: string;
  offerTag: string | null;
  images: PostMedia[];
  hasVideo: boolean;
  attachment: { type: 'product' | 'service'; id: string; title: string; price: string } | null;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
}

/** Flattens a Post for the card: display strings in one place, so the card stays dumb. */
export function toPostCardModel(post: Post, now?: Date): PostCardModel {
  return {
    id: post.id,
    businessSlug: post.business.slug,
    businessName: post.business.name,
    businessLogoUrl: post.business.logo?.url,
    isVerified: post.business.isVerified,
    city: post.business.city.name,
    timeAgo: formatTimeAgo(post.publishedAt ?? post.createdAt, now),
    body: post.body,
    offerTag: post.offerTag,
    images: post.media.filter((m) => m.kind === 'image'),
    hasVideo: post.media.some((m) => m.kind === 'video'),
    attachment: post.attachment
      ? {
          type: post.attachment.type,
          id: post.attachment.id,
          title: post.attachment.title,
          price: formatPrice(post.attachment.price),
        }
      : null,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    isLiked: post.isLiked,
    isSaved: post.isSaved,
  };
}
