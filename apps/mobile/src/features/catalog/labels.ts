import type { Area, Product, Service } from '@supporters/shared';
import { formatPrice } from '../social/mappers';

const words = (value: string) => value.replace(/_/g, ' ');
const capitalise = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export const productAvailabilityLabel = (value: Product['availability']) =>
  ({ in_stock: 'In stock', made_to_order: 'Made to order', bulk: 'Bulk orders' })[value];

export const serviceAvailabilityLabel = (value: Service['availability']) =>
  ({
    immediate: 'Available now',
    within_24_hours: 'Within 24 hours',
    by_appointment: 'By appointment',
  })[value];

/** "₹1,200 / kg", "₹500 per hour" or "Ask for price". */
export function productPriceLabel(product: Product): string {
  const price = formatPrice(product.price);
  return product.price && product.unit ? `${price} / ${words(product.unit)}` : price;
}

export function servicePriceLabel(service: Service): string {
  const price = formatPrice(service.price);
  return service.price && service.priceUnit ? `${price} ${words(service.priceUnit)}` : price;
}

export function moqLabel(product: Product): string | null {
  if (!product.moq) return null;
  return `MOQ: ${product.moq.toLocaleString('en-IN')}${product.unit ? ` ${words(product.unit)}` : ''}`;
}

/** "All India", or the state and city names. */
export function areaLabel(area: Area): string {
  if (area.allIndia) return 'All India';
  const names = [...area.cities.map((c) => c.name), ...area.states.map((s) => s.name)];
  return names.length > 0 ? names.join(', ') : 'Not specified';
}

export { capitalise };

/** "sq_metre" becomes "Sq metre". */
export const unitOptionLabel = (unit: string) => capitalise(words(unit));
