import type {
  Area,
  Business,
  BusinessType,
  Money,
  OpeningHours,
  Product,
  Service,
} from '@supporters/shared';

/** Shown instead of a price when the owner left it empty (product spec, Decisions #14). */
export const ASK_FOR_PRICE = 'Ask for price';

const inrWhole = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const inrPaise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** `₹1,25,000` or `₹99.50`: paise only when there are some. */
export function formatMoney(money: Money): string {
  const format = money.amountPaise % 100 === 0 ? inrWhole : inrPaise;
  return format.format(money.amountPaise / 100);
}

/** `"149.50"` for schema.org `price`, which wants a plain decimal. */
export function moneyToDecimal(money: Money): string {
  const rupees = Math.trunc(money.amountPaise / 100);
  const paise = Math.abs(money.amountPaise % 100);
  return paise === 0 ? String(rupees) : `${rupees}.${String(paise).padStart(2, '0')}`;
}

/** Rupees typed into a form (`"1,499.5"`) to integer paise, or null when it isn't a price. */
export function rupeesToPaise(input: string): number | null {
  const cleaned = input.replace(/[,\s₹]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole = '0', fraction = ''] = cleaned.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

/** Integer paise back to the rupee string a form shows. */
export function paiseToRupees(paise: number): string {
  return moneyToDecimal({ amountPaise: paise, currency: 'INR' });
}

/** `snake_case` enum values to sentence case: `sq_metre` → `sq metre`. */
function humanize(value: string): string {
  return value.replace(/_/g, ' ');
}

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  manufacturer: 'Manufacturer',
  wholesaler: 'Wholesaler',
  retailer: 'Retailer',
  distributor: 'Distributor',
  brand: 'Brand',
  service_provider: 'Service provider',
};

export const PRODUCT_AVAILABILITY_LABELS: Record<Product['availability'], string> = {
  in_stock: 'In stock',
  made_to_order: 'Made to order',
  bulk: 'Available for bulk',
};

export const SERVICE_AVAILABILITY_LABELS: Record<Service['availability'], string> = {
  immediate: 'Immediate',
  within_24_hours: 'Within 24 hours',
  by_appointment: 'By appointment',
};

export function unitLabel(unit: string): string {
  return humanize(unit);
}

/** `per_hour` → `per hour`. */
export function priceUnitLabel(unit: string): string {
  return humanize(unit);
}

/** The price line on cards and detail pages. */
export function listingPriceText(listing: Product | Service): string {
  if (!listing.price) return ASK_FOR_PRICE;
  const amount = formatMoney(listing.price);
  if ('unit' in listing && listing.unit) return `${amount} / ${unitLabel(listing.unit)}`;
  if ('priceUnit' in listing) {
    const from = `From ${amount}`;
    return listing.priceUnit ? `${from} ${priceUnitLabel(listing.priceUnit)}` : from;
  }
  return amount;
}

/** `All India`, or the state and city names. */
export function areaLabel(area: Area): string {
  if (area.allIndia) return 'All India';
  const names = [...area.cities.map((city) => city.name), ...area.states.map((s) => s.name)];
  return names.length > 0 ? names.join(', ') : 'Not specified';
}

const DAY_LABELS: Record<OpeningHours[number]['day'], string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

/** One line per day with its slots, in week order: `Mon: 09:00–13:00, 14:00–18:00`. */
export function openingHoursLines(hours: OpeningHours): string[] {
  const order = Object.keys(DAY_LABELS) as OpeningHours[number]['day'][];
  return order.flatMap((day) => {
    const slots = hours.filter((slot) => slot.day === day);
    if (slots.length === 0) return [];
    const text = slots.map((slot) => `${slot.opens}–${slot.closes}`).join(', ');
    return [`${DAY_LABELS[day]}: ${text}`];
  });
}

/** The address line on the business page: street, city, state and PIN. */
export function businessAddress(business: Business): string {
  const parts = [business.address, business.city.name, business.state.name];
  const line = parts.filter((part): part is string => Boolean(part)).join(', ');
  return business.pincode ? `${line} ${business.pincode}` : line;
}

/** Up to `max` characters, cut at a word boundary, for meta descriptions. */
export function truncate(text: string, max = 160): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** Two-letter initials for logo fallbacks. */
export function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase());
  return letters.join('') || '?';
}
