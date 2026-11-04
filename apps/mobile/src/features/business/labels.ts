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

const DAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const SHORT_DAYS: Record<(typeof DAY_ORDER)[number], string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

/** "Mon - Sat: 09:00 - 19:30, Sun: closed"; days with the same times are joined into a range. */
export function openingHoursSummary(
  slots: { day: (typeof DAY_ORDER)[number]; opens: string; closes: string }[],
): string | null {
  if (slots.length === 0) return null;
  const groups: { first: number; last: number; times: string }[] = [];
  DAY_ORDER.forEach((day, index) => {
    const times = slots
      .filter((slot) => slot.day === day)
      .map((slot) => `${slot.opens} - ${slot.closes}`)
      .join(', ');
    if (!times) return;
    const previous = groups[groups.length - 1];
    if (previous && previous.last === index - 1 && previous.times === times) previous.last = index;
    else groups.push({ first: index, last: index, times });
  });
  return groups
    .map(({ first, last, times }) =>
      first === last
        ? `${SHORT_DAYS[DAY_ORDER[first]]}: ${times}`
        : `${SHORT_DAYS[DAY_ORDER[first]]} - ${SHORT_DAYS[DAY_ORDER[last]]}: ${times}`,
    )
    .join(', ');
}

/** "12 / 25" on a plan with a limit, "12" without one; `atLimit` when no more can be published. */
export function listingsUsage(
  published: number,
  limit: number | null,
): { label: string; atLimit: boolean } {
  if (limit === null) return { label: String(published), atLimit: false };
  return { label: `${published} / ${limit}`, atLimit: published >= limit };
}
