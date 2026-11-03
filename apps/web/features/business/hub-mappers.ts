import type { MyBusiness, Product, Service } from '@supporters/shared';
import { listingPriceText } from '@/lib/catalog/format';
import { productPath, servicePath } from '@/lib/catalog/seo';
import type { HubBusiness } from './hub-header';
import type { ListingLimit } from './listing-limit';
import type { ListingRow } from './listing-table';

/** Server-side: the owner's API objects to the small props the Hub's client parts get. */

export function toHubBusiness(business: MyBusiness): HubBusiness {
  return {
    name: business.name,
    slug: business.slug,
    city: business.city.name,
    state: business.state.name,
    logoUrl: business.logo?.url ?? null,
    isVerified: business.isVerified,
  };
}

export function toListingLimit(business: MyBusiness): ListingLimit {
  return { published: business.publishedListings, limit: business.publishedListingsLimit };
}

export function toListingRow(listing: Product | Service): ListingRow {
  const isProduct = 'specs' in listing;
  return {
    id: listing.id,
    title: listing.title,
    imageUrl: listing.images[0]?.url ?? null,
    category: listing.category.name,
    priceText: listingPriceText(listing),
    status: listing.status,
    publicHref: isProduct ? productPath(listing.id) : servicePath(listing.id),
  };
}
