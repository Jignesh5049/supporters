import type { Product, Service } from '@supporters/shared';
import { Badge } from '@supporters/ui-web/components/badge';
import { ImageOff, MapPin } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ASK_FOR_PRICE,
  PRODUCT_AVAILABILITY_LABELS,
  SERVICE_AVAILABILITY_LABELS,
  listingPriceText,
  unitLabel,
} from '@/lib/catalog/format';
import { businessPath, productPath, servicePath } from '@/lib/catalog/seo';
import { BusinessLogo } from './business-logo';

type ListingCardProps =
  | { kind: 'product'; listing: Product; showBusiness?: boolean }
  | { kind: 'service'; listing: Service; showBusiness?: boolean };

/** A published product or service in a grid: business tabs and "more from" rows. */
export function ListingCard(props: ListingCardProps) {
  const { listing, showBusiness = true } = props;
  const href = props.kind === 'product' ? productPath(listing.id) : servicePath(listing.id);
  const availability =
    props.kind === 'product'
      ? PRODUCT_AVAILABILITY_LABELS[props.listing.availability]
      : SERVICE_AVAILABILITY_LABELS[props.listing.availability];
  const detail =
    props.kind === 'product'
      ? props.listing.moq
        ? `MOQ: ${props.listing.moq} ${props.listing.unit ? unitLabel(props.listing.unit) : ''}`
        : null
      : props.listing.turnaround
        ? `Turnaround: ${props.listing.turnaround}`
        : null;
  const price = listingPriceText(listing);
  const image = listing.images[0];

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition-shadow hover:shadow-sm">
      <Link href={href} className="relative block aspect-4/3 w-full overflow-hidden bg-muted">
        {image ? (
          <Image
            src={image.url}
            alt={listing.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            // Listing media is re-encoded and resized by the API's media pipeline.
            unoptimized
          />
        ) : (
          <span className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-8" aria-hidden />
          </span>
        )}
        <Badge variant="secondary" className="absolute bottom-2.5 left-2.5">
          {availability}
        </Badge>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        {showBusiness && (
          <div className="flex items-center gap-2 text-caption text-muted-foreground">
            <BusinessLogo
              name={listing.business.name}
              url={listing.business.logo?.url}
              className="size-6 rounded-md"
            />
            <Link
              href={businessPath(listing.business.slug)}
              className="flex-1 truncate font-semibold hover:text-primary"
            >
              {listing.business.name}
            </Link>
            <span className="flex shrink-0 items-center gap-0.5">
              <MapPin className="size-3" aria-hidden />
              {listing.business.city.name}
            </span>
          </div>
        )}

        <h3 className="line-clamp-2 text-body-sm font-bold text-foreground">
          <Link href={href} className="hover:text-primary">
            {listing.title}
          </Link>
        </h3>

        <div className="mt-auto border-t border-border pt-2">
          <p
            className={
              price === ASK_FOR_PRICE
                ? 'text-body-sm font-semibold text-highlight'
                : 'text-body font-black text-primary'
            }
          >
            {price}
          </p>
          {detail && <p className="text-caption text-muted-foreground">{detail}</p>}
        </div>
      </div>
    </article>
  );
}
