import { Info } from 'lucide-react';

/** Published products plus services against the plan's cap (null: Premium, no cap). */
export interface ListingLimit {
  published: number;
  limit: number | null;
}

export const isAtLimit = ({ published, limit }: ListingLimit) =>
  limit !== null && published >= limit;

/** "12 of 25 published" for the Hub lists; null on Premium. */
export function listingUsage({ published, limit }: ListingLimit): string | null {
  return limit === null ? null : `${published} of ${limit} published listings used`;
}

/**
 * The free-plan limit message (product spec: 25 published listings,
 * Decisions #7). The API enforces it; this explains it before a save fails.
 */
export function ListingLimitNotice({ limit }: { limit: ListingLimit }) {
  if (!isAtLimit(limit)) return null;
  return (
    <div
      role="status"
      className="flex items-start gap-2.5 rounded-xl border border-border bg-warning-soft p-3 text-body-sm text-foreground"
    >
      <Info className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <p>
        You have published {limit.published} of {limit.limit} listings, the free plan limit for
        products and services combined. Save new listings as drafts, unpublish or archive one, or
        upgrade to Premium for unlimited listings.
      </p>
    </div>
  );
}
