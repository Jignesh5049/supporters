import type { Area, Business, BusinessSummary, Product, Service } from '@supporters/shared';
import type { Metadata } from 'next';
import { moneyToDecimal, truncate } from './format';

/** Public URLs on the app's own origin (the canonical host). */
export const businessPath = (slug: string) => `/business/${slug}`;
export const productPath = (id: string) => `/product/${id}`;
export const servicePath = (id: string) => `/service/${id}`;

type JsonLd = Record<string, unknown>;

/**
 * JSON for a `<script type="application/ld+json">`. `JSON.stringify` does not
 * escape `<`, so an owner-typed `</script>` could close the tag; the Next.js
 * JSON-LD guide recommends escaping it. `>`, `&` and the line separators are
 * escaped too, so the output is safe anywhere in HTML.
 */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const SCHEMA_DAYS = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
} as const;

/** Drops undefined, null and empty-array values so the JSON-LD stays minimal. */
function compact(data: JsonLd): JsonLd {
  return Object.fromEntries(
    Object.entries(data).filter(
      ([, value]) => value != null && !(Array.isArray(value) && value.length === 0),
    ),
  );
}

export function businessJsonLd(business: Business, origin: string): JsonLd {
  const url = `${origin}${businessPath(business.slug)}`;
  const sameAs = [business.website, ...Object.values(business.socials)].filter(
    (link): link is string => Boolean(link),
  );
  return compact({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${url}#business`,
    name: business.name,
    url,
    description: business.about ?? undefined,
    image: business.cover?.url ?? business.logo?.url,
    logo: business.logo?.url,
    telephone: business.contactPhone ?? undefined,
    email: business.contactEmail ?? undefined,
    foundingDate: business.establishedYear ? String(business.establishedYear) : undefined,
    address: compact({
      '@type': 'PostalAddress',
      streetAddress: business.address ?? undefined,
      addressLocality: business.city.name,
      addressRegion: business.state.name,
      postalCode: business.pincode ?? undefined,
      addressCountry: 'IN',
    }),
    hasMap: business.mapUrl ?? undefined,
    sameAs,
    openingHoursSpecification: business.openingHours.map((slot) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${SCHEMA_DAYS[slot.day]}`,
      opens: slot.opens,
      closes: slot.closes,
    })),
  });
}

function seller(business: BusinessSummary, origin: string): JsonLd {
  return {
    '@type': 'Organization',
    name: business.name,
    url: `${origin}${businessPath(business.slug)}`,
  };
}

const PRODUCT_AVAILABILITY: Record<Product['availability'], string> = {
  in_stock: 'https://schema.org/InStock',
  made_to_order: 'https://schema.org/MadeToOrder',
  bulk: 'https://schema.org/InStock',
};

/**
 * `Product` with an `Offer`. A listing without a price ("Ask for price") gets
 * no `offers`: an Offer without `price` is invalid for search engines.
 */
export function productJsonLd(product: Product, origin: string): JsonLd {
  const url = `${origin}${productPath(product.id)}`;
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: product.title,
    description: product.description,
    url,
    image: product.images.map((image) => image.url),
    sku: product.id,
    category: product.category.name,
    brand: { '@type': 'Brand', name: product.business.name },
    additionalProperty: product.specs.map((spec) => ({
      '@type': 'PropertyValue',
      name: spec.key,
      value: spec.value,
    })),
    offers: product.price
      ? compact({
          '@type': 'Offer',
          url,
          price: moneyToDecimal(product.price),
          priceCurrency: 'INR',
          availability: PRODUCT_AVAILABILITY[product.availability],
          eligibleQuantity: product.moq
            ? compact({
                '@type': 'QuantitativeValue',
                minValue: product.moq,
                unitText: product.unit ?? undefined,
              })
            : undefined,
          seller: seller(product.business, origin),
        })
      : undefined,
  });
}

function areaServed(area: Area): JsonLd | JsonLd[] {
  if (area.allIndia) return { '@type': 'Country', name: 'India' };
  return [
    ...area.cities.map((city) => ({ '@type': 'City', name: city.name })),
    ...area.states.map((state) => ({ '@type': 'State', name: state.name })),
  ];
}

export function serviceJsonLd(service: Service, origin: string): JsonLd {
  const url = `${origin}${servicePath(service.id)}`;
  return compact({
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': `${url}#service`,
    name: service.title,
    description: service.description,
    url,
    image: service.images.map((image) => image.url),
    serviceType: service.category.name,
    provider: {
      '@type': 'LocalBusiness',
      name: service.business.name,
      url: `${origin}${businessPath(service.business.slug)}`,
    },
    areaServed: areaServed(service.serviceArea),
    offers: service.price
      ? {
          '@type': 'Offer',
          url,
          price: moneyToDecimal(service.price),
          priceCurrency: 'INR',
          seller: seller(service.business, origin),
        }
      : undefined,
  });
}

interface PageSeo {
  title: string;
  description: string;
  path: string;
  image: string | undefined;
  type: 'website' | 'article';
}

/** Title, description, canonical, Open Graph and Twitter card for a public page. */
export function pageMetadata(seo: PageSeo, origin: string): Metadata {
  const url = `${origin}${seo.path}`;
  const description = truncate(seo.description);
  const images = seo.image ? [{ url: seo.image, alt: seo.title }] : undefined;
  return {
    title: seo.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: seo.title,
      description,
      url,
      siteName: 'Supporters',
      type: seo.type,
      locale: 'en_IN',
      images,
    },
    twitter: {
      card: seo.image ? 'summary_large_image' : 'summary',
      title: seo.title,
      description,
      images: seo.image ? [seo.image] : undefined,
    },
  };
}

export function businessMetadata(business: Business, origin: string): Metadata {
  const place = `${business.city.name}, ${business.state.name}`;
  return pageMetadata(
    {
      title: `${business.name} · ${business.category.name} in ${place}`,
      description:
        business.about ??
        `${business.name} is a ${business.category.name.toLowerCase()} business in ${place} on Supporters.`,
      path: businessPath(business.slug),
      image: business.cover?.url ?? business.logo?.url,
      type: 'website',
    },
    origin,
  );
}

export function listingMetadata(listing: Product | Service, origin: string): Metadata {
  const isProduct = 'specs' in listing;
  return pageMetadata(
    {
      title: `${listing.title} · ${listing.business.name}`,
      description: listing.description,
      path: isProduct ? productPath(listing.id) : servicePath(listing.id),
      image: listing.images[0]?.url,
      type: 'website',
    },
    origin,
  );
}

/** For a page whose business or listing doesn't exist or isn't published. */
export const NOT_FOUND_METADATA: Metadata = {
  title: 'Not found',
  robots: { index: false, follow: false },
};
