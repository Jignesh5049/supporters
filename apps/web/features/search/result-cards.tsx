import type { BusinessCard, ListingResult, PostCard, SearchHit } from '@supporters/shared';
import { Badge } from '@supporters/ui-web/components/badge';
import { BadgeCheck, Heart, ImageOff, MapPin, MessageCircle, Users } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { BusinessLogo } from '@/components/catalog/business-logo';
import {
  ASK_FOR_PRICE,
  BUSINESS_TYPE_LABELS,
  PRODUCT_AVAILABILITY_LABELS,
  SERVICE_AVAILABILITY_LABELS,
  formatMoney,
  priceUnitLabel,
  unitLabel,
} from '@/lib/catalog/format';
import { businessPath, productPath, servicePath } from '@/lib/catalog/seo';

const cardClass =
  'group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xs transition-shadow hover:shadow-sm';

/** `₹450 / kg`, `From ₹2,000 per job`, or "Ask for price". */
export function listingResultPrice(listing: ListingResult): string {
  if (!listing.price) return ASK_FOR_PRICE;
  const amount = formatMoney(listing.price);
  if (listing.kind === 'product') {
    return listing.priceUnit ? `${amount} / ${unitLabel(listing.priceUnit)}` : amount;
  }
  const from = `From ${amount}`;
  return listing.priceUnit ? `${from} ${priceUnitLabel(listing.priceUnit)}` : from;
}

function availabilityLabel(listing: ListingResult): string {
  const labels: Record<string, string> = {
    ...PRODUCT_AVAILABILITY_LABELS,
    ...SERVICE_AVAILABILITY_LABELS,
  };
  return labels[listing.availability] ?? listing.availability;
}

/** A business: logo, name, badge, type, place and followers. */
export function BusinessResultCard({ business }: { business: BusinessCard }) {
  return (
    <article className={`${cardClass} gap-3 p-4`}>
      <div className="flex items-center gap-3">
        <BusinessLogo name={business.name} url={business.logo?.url} className="size-12" />
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1 text-body-sm font-bold text-foreground">
            <Link href={businessPath(business.slug)} className="truncate hover:text-primary">
              {business.name}
            </Link>
            {business.isVerified && (
              <BadgeCheck className="size-4 shrink-0 text-highlight" aria-label="Verified" />
            )}
          </h3>
          <p className="truncate text-caption text-muted-foreground">
            {BUSINESS_TYPE_LABELS[business.type]} · {business.category.name}
          </p>
        </div>
      </div>
      {business.about && (
        <p className="line-clamp-2 text-caption text-muted-foreground">{business.about}</p>
      )}
      <div className="mt-auto flex items-center justify-between gap-2 text-caption text-muted-foreground">
        <span className="flex items-center gap-1">
          <MapPin className="size-3.5" aria-hidden />
          {business.city.name}, {business.state.code}
        </span>
        <span className="flex items-center gap-1">
          <Users className="size-3.5" aria-hidden />
          {business.followerCount} {business.followerCount === 1 ? 'follower' : 'followers'}
        </span>
        <Badge variant="outline">
          {business.rating === null ? 'New' : `★ ${business.rating.toFixed(1)}`}
        </Badge>
      </div>
    </article>
  );
}

/** A product or service: image, title, seller, price. */
export function ListingResultCard({ listing }: { listing: ListingResult }) {
  const href = listing.kind === 'product' ? productPath(listing.id) : servicePath(listing.id);
  const price = listingResultPrice(listing);
  return (
    <article className={cardClass}>
      <Link href={href} className="relative block aspect-4/3 w-full overflow-hidden bg-muted">
        {listing.image ? (
          <Image
            src={listing.image.url}
            alt={listing.title}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
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
          {availabilityLabel(listing)}
        </Badge>
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
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
          {listing.moq !== null && (
            <p className="text-caption text-muted-foreground">MOQ: {listing.moq}</p>
          )}
        </div>
      </div>
    </article>
  );
}

/** A post: seller, excerpt, first image and counts. */
export function PostResultCard({ post }: { post: PostCard }) {
  return (
    <article className={`${cardClass} gap-3 p-4`}>
      <div className="flex items-center gap-2 text-caption text-muted-foreground">
        <BusinessLogo name={post.business.name} url={post.business.logo?.url} className="size-8" />
        <Link
          href={businessPath(post.business.slug)}
          className="flex-1 truncate font-semibold text-foreground hover:text-primary"
        >
          {post.business.name}
        </Link>
        {post.offerTag && <Badge>{post.offerTag}</Badge>}
      </div>
      <Link href={`/post/${post.id}`} className="space-y-3">
        {post.image && (
          <span className="relative block aspect-video overflow-hidden rounded-xl bg-muted">
            <Image
              src={post.image.url}
              alt=""
              fill
              sizes="(min-width: 1024px) 33vw, 100vw"
              className="object-cover"
              unoptimized
            />
          </span>
        )}
        <p className="line-clamp-3 text-body-sm text-foreground">{post.excerpt}</p>
      </Link>
      <p className="mt-auto flex items-center gap-4 text-caption text-muted-foreground">
        <span className="flex items-center gap-1">
          <Heart className="size-3.5" aria-hidden />
          <span className="sr-only">Likes</span>
          {post.likeCount}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="size-3.5" aria-hidden />
          <span className="sr-only">Comments</span>
          {post.commentCount}
        </span>
      </p>
    </article>
  );
}

export function SearchHitCard({ hit }: { hit: SearchHit }) {
  switch (hit.type) {
    case 'business':
      return <BusinessResultCard business={hit.business} />;
    case 'product':
    case 'service':
      return <ListingResultCard listing={hit.listing} />;
    case 'post':
      return <PostResultCard post={hit.post} />;
  }
}
