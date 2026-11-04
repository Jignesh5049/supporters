import type { BusinessType } from '@supporters/shared';

const TYPE_LABELS: Record<BusinessType, string> = {
  manufacturer: 'Manufacturer',
  wholesaler: 'Wholesaler',
  retailer: 'Retailer',
  distributor: 'Distributor',
  brand: 'Brand',
  service_provider: 'Service Provider',
};

export const businessTypeLabel = (type: BusinessType) => TYPE_LABELS[type];

const DAY_LABELS = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
} as const;

export const dayLabel = (day: keyof typeof DAY_LABELS) => DAY_LABELS[day];

/** Only http(s) links are opened from a business page, so a stored `javascript:` link can't run. */
export function safeWebUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}
