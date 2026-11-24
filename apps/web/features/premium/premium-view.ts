import type { PremiumStatus } from '@supporters/shared';

/** How long the success screen waits for the webhook before saying it is still confirming. */
export const CONFIRM_TIMEOUT_MS = 90_000;
export const POLL_INTERVAL_MS = 2_000;

export interface StatusView {
  tone: 'neutral' | 'success' | 'warning' | 'info';
  title: string;
  body: string;
}

const date = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

/** The headline of the status card for each state (product spec: renewal, failure, cancel). */
export function describeStatus(status: PremiumStatus): StatusView {
  switch (status.state) {
    case 'active':
      if (!status.autoRenew) {
        return {
          tone: 'info',
          title: 'Premium is on, and will not renew',
          body: `Your perks stay on until ${status.expiresAt ? date(status.expiresAt) : 'the end of the year'}. Nothing is charged again.`,
        };
      }
      return {
        tone: 'success',
        title: 'Premium is active',
        body: status.renewsAt ? `Renews on ${date(status.renewsAt)}.` : 'Your perks are on.',
      };
    case 'grace':
      return {
        tone: 'warning',
        title: 'Your renewal payment failed',
        body: `Premium stays on${status.graceEndsAt ? ` until ${date(status.graceEndsAt)}` : ' for 7 days'} while we retry. Make sure your UPI AutoPay or card can be charged.`,
      };
    case 'pending':
      return {
        tone: 'info',
        title: 'Waiting for your payment',
        body: 'Premium starts as soon as the payment is confirmed.',
      };
    case 'expired':
      return {
        tone: 'neutral',
        title: 'Premium has ended',
        body: 'Your perks are off. Nothing was deleted. Renew to get them back.',
      };
    case 'none':
      return {
        tone: 'neutral',
        title: 'You are on the free plan',
        body: 'Go Premium for a badge, search boost, Discover placement and no listing limits.',
      };
  }
}

/** The buy button is offered when there is no Premium to extend. */
export const canBuy = (status: PremiumStatus) =>
  status.state === 'none' || status.state === 'expired' || status.state === 'pending';

export const canCancel = (status: PremiumStatus) =>
  (status.state === 'active' || status.state === 'grace') && status.autoRenew;

/** ₹999 from integer paise, never through floats of rupees. */
export function formatMoney(money: { amountPaise: number }): string {
  const rupees = Math.floor(money.amountPaise / 100);
  const paise = money.amountPaise % 100;
  return `₹${rupees.toLocaleString('en-IN')}${paise ? `.${String(paise).padStart(2, '0')}` : ''}`;
}

export const PERK_LABELS: Record<string, string> = {
  badge: 'Premium badge on your page, posts and listings',
  featured: 'Featured placement in Discover',
  search_boost: 'Boost in search among equal matches',
  unlimited_listings: 'Unlimited published products and services',
  unlimited_posts: 'Unlimited posts',
  analytics_history: 'Full analytics history',
  requirement_priority: 'Priority in buyer requirement matching',
};
