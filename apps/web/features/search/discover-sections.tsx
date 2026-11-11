import type {
  BusinessCard,
  CategoryTree,
  DiscoverResponse,
  ListingResult,
} from '@supporters/shared';
import type { LucideIcon } from 'lucide-react';
import { MapPin, Sparkles, Star, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { BusinessResultCard, ListingResultCard } from './result-cards';
import { searchHref } from './search-params';

interface DiscoverSectionsProps {
  discover: DiscoverResponse;
  categories: CategoryTree[];
  isSignedIn: boolean;
}

/** The Discover page below the search box: categories, then each section that has items. */
export function DiscoverSections({ discover, categories, isSignedIn }: DiscoverSectionsProps) {
  const { trending, featured, nearYou, suggested } = discover;
  return (
    <div className="space-y-10">
      {categories.length > 0 && (
        <nav aria-label="Browse by category">
          <ul className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={searchHref({ category: category.slug })}
                  className="inline-flex rounded-full border border-border bg-card px-3 py-1.5 text-body-sm font-semibold text-foreground hover:border-primary hover:text-primary"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {isSignedIn && (
        <BusinessSection
          icon={Sparkles}
          title="Suggested for you"
          description="In your interests, not followed yet"
          businesses={suggested}
        />
      )}
      <BusinessSection
        icon={TrendingUp}
        title="Trending"
        description="Most new followers and enquiries this week"
        businesses={trending}
      />
      <ListingSection
        icon={Star}
        title="Featured"
        description="From Premium businesses"
        listings={featured}
      />
      {nearYou.city && (
        <BusinessSection
          icon={MapPin}
          title={`Near you in ${nearYou.city.name}`}
          businesses={nearYou.data}
          moreHref={searchHref({ city: nearYou.city.id, state: nearYou.city.stateCode })}
        />
      )}
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  description,
  moreHref,
  id,
}: {
  icon: LucideIcon;
  title: string;
  description?: string | undefined;
  moreHref?: string | undefined;
  id: string;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 id={id} className="flex items-center gap-2 text-title-sm font-bold text-foreground">
          <Icon className="size-5 text-primary" aria-hidden />
          {title}
        </h2>
        {description && <p className="text-caption text-muted-foreground">{description}</p>}
      </div>
      {moreHref && (
        <Link href={moreHref} className="text-body-sm font-semibold text-primary hover:underline">
          See all
        </Link>
      )}
    </div>
  );
}

const sectionId = (title: string) => `discover-${title.toLowerCase().replace(/[^a-z]+/g, '-')}`;

function BusinessSection(props: {
  icon: LucideIcon;
  title: string;
  description?: string;
  moreHref?: string;
  businesses: BusinessCard[];
}) {
  if (props.businesses.length === 0) return null;
  const id = sectionId(props.title);
  return (
    <section aria-labelledby={id}>
      <SectionHeader {...props} id={id} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {props.businesses.map((business) => (
          <li key={business.id} className="flex [&>article]:flex-1">
            <BusinessResultCard business={business} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ListingSection(props: {
  icon: LucideIcon;
  title: string;
  description?: string;
  listings: ListingResult[];
}) {
  if (props.listings.length === 0) return null;
  const id = sectionId(props.title);
  return (
    <section aria-labelledby={id}>
      <SectionHeader {...props} id={id} />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {props.listings.map((listing) => (
          <li key={`${listing.kind}-${listing.id}`} className="flex [&>article]:flex-1">
            <ListingResultCard listing={listing} />
          </li>
        ))}
      </ul>
    </section>
  );
}
