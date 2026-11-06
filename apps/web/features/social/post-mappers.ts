import type { Post, PostType } from '@supporters/shared';
import { ASK_FOR_PRICE, formatMoney, truncate } from '@/lib/catalog/format';
import { businessPath, productPath, servicePath } from '@/lib/catalog/seo';

/** What a post card renders, derived from the API's post. */
export interface PostView {
  id: string;
  href: string;
  typeLabel: string;
  body: string;
  business: {
    id: string;
    name: string;
    href: string;
    logoUrl: string | null;
    city: string;
    isVerified: boolean;
  };
  /** Shown as "Published 3 Nov, 4:05 pm" (India time, so server and browser agree). */
  publishedLabel: string | null;
  publishedAt: string | null;
  offer: { tag: string; endsLabel: string | null; isEnded: boolean } | null;
  media: { kind: 'video'; url: string } | { kind: 'images'; urls: string[] } | null;
  attachment: {
    id: string;
    kind: 'product' | 'service';
    title: string;
    href: string;
    priceText: string;
    imageUrl: string | null;
  } | null;
}

export const POST_TYPE_LABELS: Record<PostType, string> = {
  product: 'Product',
  service: 'Service',
  update: 'Update',
  offer: 'Offer',
  testimonial: 'Testimonial',
};

export const postPath = (id: string) => `/post/${id}`;

const dateTime = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
  timeZone: 'Asia/Kolkata',
});
const dateOnly = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

export const formatPostTime = (iso: string) => dateTime.format(new Date(iso));

export function toPostView(post: Post, now: Date = new Date()): PostView {
  const images = post.media.filter((item) => item.kind === 'image').map((item) => item.url);
  const video = post.media.find((item) => item.kind === 'video');
  const attachment = post.attachment;
  return {
    id: post.id,
    href: postPath(post.id),
    typeLabel: POST_TYPE_LABELS[post.type],
    body: post.body,
    business: {
      id: post.business.id,
      name: post.business.name,
      href: businessPath(post.business.slug),
      logoUrl: post.business.logo?.url ?? null,
      city: post.business.city.name,
      isVerified: post.business.isVerified,
    },
    publishedAt: post.publishedAt,
    publishedLabel: post.publishedAt ? formatPostTime(post.publishedAt) : null,
    offer: post.offerTag
      ? {
          tag: post.offerTag,
          endsLabel: post.offerEndsAt ? dateOnly.format(new Date(post.offerEndsAt)) : null,
          isEnded: post.offerEndsAt !== null && new Date(post.offerEndsAt) <= now,
        }
      : null,
    media: video
      ? { kind: 'video', url: video.url }
      : images.length > 0
        ? { kind: 'images', urls: images }
        : null,
    attachment: attachment
      ? {
          id: attachment.id,
          kind: attachment.type,
          title: attachment.title,
          href:
            attachment.type === 'product' ? productPath(attachment.id) : servicePath(attachment.id),
          priceText: attachment.price ? formatMoney(attachment.price) : ASK_FOR_PRICE,
          imageUrl: attachment.image?.url ?? null,
        }
      : null,
  };
}

/** `12 likes`, `1 comment`. */
export function countLabel(count: number, singular: string, plural = `${singular}s`) {
  return `${count.toLocaleString('en-IN')} ${count === 1 ? singular : plural}`;
}

/** The post page's title and description: the business and the opening words. */
export function postSummary(post: Post): { title: string; description: string } {
  const lead = post.body.trim() || `${POST_TYPE_LABELS[post.type]} from ${post.business.name}`;
  return {
    title: `${post.business.name}: ${truncate(lead.split('\n')[0] ?? lead, 60)}`,
    description: truncate(lead, 160),
  };
}

/** Where a guest feed puts its sign-up prompt: after every 10th post. */
export const SIGN_UP_PROMPT_EVERY = 10;

export function withSignUpPrompts<T>(
  items: T[],
  every = SIGN_UP_PROMPT_EVERY,
): ({ kind: 'item'; item: T } | { kind: 'prompt'; key: string })[] {
  const out: ({ kind: 'item'; item: T } | { kind: 'prompt'; key: string })[] = [];
  items.forEach((item, index) => {
    out.push({ kind: 'item', item });
    if ((index + 1) % every === 0) out.push({ kind: 'prompt', key: `prompt-${index + 1}` });
  });
  return out;
}
