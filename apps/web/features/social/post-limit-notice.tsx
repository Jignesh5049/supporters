import { Info } from 'lucide-react';
import type { PostLimit } from './post-form-values';

/** "3 of 10 posts published in the last 7 days" for the Hub; null on Premium. */
export function postUsage({ used, limit }: PostLimit): string | null {
  return limit === null ? null : `${used} of ${limit} posts published in the last 7 days`;
}

/**
 * The free-plan weekly limit message (product spec, Decisions #7). The API
 * enforces it (409); this explains it before a publish fails.
 */
export function PostLimitNotice({ limit }: { limit: PostLimit }) {
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-xl border border-border bg-warning-soft p-3 text-body-sm text-foreground"
    >
      <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p>
        You have published {limit.used} of {limit.limit} posts in the last 7 days, the free plan
        limit. Save new posts as drafts and publish them when a slot frees up, or upgrade to Premium
        for unlimited posts.
      </p>
    </div>
  );
}
