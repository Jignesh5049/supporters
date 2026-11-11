import type { ListingResult } from '@supporters/shared';
import { productAvailabilityLabel, serviceAvailabilityLabel } from '../catalog/labels';
import { formatPrice } from '../social/mappers';

/** "₹450 / kg", "₹2,000 per job" or "Ask for price". */
export function listingPriceLabel(listing: ListingResult): string {
  const price = formatPrice(listing.price);
  if (!listing.price || !listing.priceUnit) return price;
  const unit = listing.priceUnit.replace(/_/g, ' ');
  return listing.kind === 'product' ? `${price} / ${unit}` : `${price} ${unit}`;
}

export function availabilityLabel(listing: ListingResult): string {
  return listing.kind === 'product'
    ? productAvailabilityLabel(listing.availability as 'in_stock')
    : serviceAvailabilityLabel(listing.availability as 'immediate');
}
