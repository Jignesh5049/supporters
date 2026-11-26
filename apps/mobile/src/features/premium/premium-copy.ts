import type { PremiumPerk, PremiumStatus } from '@supporters/shared';

/**
 * What the app says about Premium. Status only: no price, no purchase button, no link to a
 * checkout, to comply with Google Play and App Store billing rules (product spec, decision 10).
 */
export interface PremiumCopy {
  title: string;
  pill: string;
  tone: 'active' | 'warning' | 'neutral';
  /** One or two plain sentences under the title. */
  detail: string;
}

const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

export function premiumCopy(status: PremiumStatus): PremiumCopy {
  const until = status.expiresAt ? date(status.expiresAt) : null;
  switch (status.state) {
    case 'active':
      return status.autoRenew
        ? {
            title: 'Supporters Premium',
            pill: 'Active',
            tone: 'active',
            detail: status.renewsAt ? `Renews on ${date(status.renewsAt)}.` : 'Your perks are on.',
          }
        : {
            title: 'Supporters Premium',
            pill: 'Ends soon',
            tone: 'warning',
            detail: `Active until ${until ?? 'the end of the year'}. It will not renew.`,
          };
    case 'grace':
      return {
        title: 'Supporters Premium',
        pill: 'Payment failed',
        tone: 'warning',
        detail: `The last renewal payment failed. Your perks stay on${
          status.graceEndsAt ? ` until ${date(status.graceEndsAt)}` : ' for a few days'
        }.`,
      };
    case 'pending':
      return {
        title: 'Supporters Premium',
        pill: 'Waiting',
        tone: 'neutral',
        detail: 'We are waiting for a payment to be confirmed.',
      };
    case 'expired':
      return {
        title: 'Supporters Premium',
        pill: 'Ended',
        tone: 'neutral',
        detail: `Your Premium ended${until ? ` on ${until}` : ''}. Nothing was deleted.`,
      };
    case 'none':
      return {
        title: 'Supporters Free',
        pill: 'Free plan',
        tone: 'neutral',
        detail: 'Your business is on the free plan.',
      };
  }
}

export const PERK_LABELS: Record<PremiumPerk, string> = {
  badge: 'Premium badge on your business page',
  featured: 'Featured placement in Discover',
  search_boost: 'Boost in search results',
  unlimited_listings: 'Unlimited products and services',
  unlimited_posts: 'Unlimited posts',
  analytics_history: 'Full analytics history',
  requirement_priority: 'Priority in buyer requirement matching',
};

/** Where to manage it. Plain text on purpose: never a link or button to a checkout. */
export const MANAGE_ON_WEB = 'Manage Premium on the web: sign in to Supporters in a browser.';
