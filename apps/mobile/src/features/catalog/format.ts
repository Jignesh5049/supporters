import {
  BusinessType,
  ProductAvailability,
  ServiceAvailability,
  type Area,
  type Money,
  type MyBusiness,
  type Product,
  type Service,
} from '@supporters/shared';

const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

/** `₹1,250` from paise. No price means the buyer asks for one. */
export function formatPrice(price: Money | null): string {
  return price ? rupees.format(price.amountPaise / 100) : 'Ask for price';
}

/** `sq_metre` → `sq metre`; `per_hour` → `per hour`. */
export function humanize(value: string): string {
  return value.replace(/_/g, ' ');
}

export function productPriceLabel(product: Pick<Product, 'price' | 'unit'>): string {
  const price = formatPrice(product.price);
  return product.price && product.unit ? `${price} / ${humanize(product.unit)}` : price;
}

export function servicePriceLabel(service: Pick<Service, 'price' | 'priceUnit'>): string {
  if (!service.price) return formatPrice(null);
  const price = `From ${formatPrice(service.price)}`;
  return service.priceUnit ? `${price} ${humanize(service.priceUnit)}` : price;
}

export const PRODUCT_AVAILABILITY_LABELS: Record<Product['availability'], string> = {
  [ProductAvailability.InStock]: 'In stock',
  [ProductAvailability.MadeToOrder]: 'Made to order',
  [ProductAvailability.Bulk]: 'Bulk orders',
};

export const SERVICE_AVAILABILITY_LABELS: Record<Service['availability'], string> = {
  [ServiceAvailability.Immediate]: 'Available now',
  [ServiceAvailability.Within24Hours]: 'Within 24 hours',
  [ServiceAvailability.ByAppointment]: 'By appointment',
};

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  [BusinessType.Manufacturer]: 'Manufacturer',
  [BusinessType.Wholesaler]: 'Wholesaler',
  [BusinessType.Retailer]: 'Retailer',
  [BusinessType.Distributor]: 'Distributor',
  [BusinessType.Brand]: 'Brand',
  [BusinessType.ServiceProvider]: 'Service provider',
};

/** `All India`, or the states and cities a listing covers. */
export function areaLabel(area: Area): string {
  if (area.allIndia) return 'All India';
  const places = [...area.cities.map((city) => city.name), ...area.states.map((s) => s.name)];
  return places.length > 0 ? places.join(', ') : 'Not set';
}

export interface ListingLimitStatus {
  isAtLimit: boolean;
  message: string;
}

/**
 * The free plan's published-listing limit (product spec, Plans), or null when the plan has none.
 * Premium is mentioned without a price or link (mobile spec, Premium).
 */
export function listingLimitStatus(
  business: Pick<MyBusiness, 'publishedListings' | 'publishedListingsLimit'>,
): ListingLimitStatus | null {
  const limit = business.publishedListingsLimit;
  if (limit === null) return null;
  const used = business.publishedListings;
  if (used >= limit) {
    return {
      isAtLimit: true,
      message: `You've published ${used} of ${limit} listings, the free plan limit. New listings save as drafts until you archive one.`,
    };
  }
  return {
    isAtLimit: false,
    message: `Free plan: ${used} of ${limit} listings published.`,
  };
}
