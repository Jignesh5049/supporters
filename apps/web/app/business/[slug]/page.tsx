import type { Business, Product, Service } from '@supporters/shared';
import { Badge } from '@supporters/ui-web/components/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@supporters/ui-web/components/tabs';
import {
  BadgeCheck,
  Building2,
  Calendar,
  Globe,
  Mail,
  MapPin,
  MessageSquareText,
  Package,
  Phone,
  ShieldCheck,
  Star,
  Wrench,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import { BusinessLogo } from '@/components/catalog/business-logo';
import { ContactActions } from '@/components/catalog/contact-actions';
import { EmptyPanel } from '@/components/catalog/empty-panel';
import { JsonLd } from '@/components/catalog/json-ld';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { ListingCard } from '@/components/catalog/listing-card';
import { getPublicBusiness, listBusinessProducts, listBusinessServices } from '@/dal/catalog';
import { getMyBusiness } from '@/dal/my-business';
import { listBusinessReviews } from '@/dal/reviews';
import { getSession } from '@/dal/session';
import { isFollowingBusiness, listBusinessPosts } from '@/dal/social';
import { ratingText } from '@/features/reviews/review-form-values';
import { ReviewsTab } from '@/features/reviews/reviews-tab';
import { BusinessPosts } from '@/features/social/business-posts';
import { ReportButton } from '@/features/moderation/report-dialog';
import { FollowButton } from '@/features/social/follow-button';
import { serverEnv } from '@/dal/config';
import { BUSINESS_TYPE_LABELS, businessAddress, openingHoursLines } from '@/lib/catalog/format';
import {
  NOT_FOUND_METADATA,
  businessJsonLd,
  businessMetadata,
  businessPath,
} from '@/lib/catalog/seo';

export async function generateMetadata({
  params,
}: PageProps<'/business/[slug]'>): Promise<Metadata> {
  const business = await getPublicBusiness((await params).slug);
  return business ? businessMetadata(business, serverEnv.APP_ORIGIN) : NOT_FOUND_METADATA;
}

/** `12` or `50+` when the tab has more than one page. */
function tabCount(page: { data: unknown[]; nextCursor: string | null }) {
  return page.nextCursor ? `${page.data.length}+` : String(page.data.length);
}

export default function BusinessProfilePage({ params }: PageProps<'/business/[slug]'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BusinessProfile params={params} />
    </Suspense>
  );
}

async function BusinessProfile({ params }: { params: Promise<{ slug: string }> }) {
  const business = await getPublicBusiness((await params).slug);
  if (!business) notFound();

  const [products, services, posts, reviews, session] = await Promise.all([
    listBusinessProducts(business.id),
    listBusinessServices(business.id),
    listBusinessPosts(business.id),
    listBusinessReviews(business.id),
    getSession(),
  ]);
  const rating = ratingText(reviews.rating);
  const myBusiness = session ? await getMyBusiness() : null;
  const isOwner = myBusiness?.id === business.id;
  const isFollowing = session && !isOwner ? await isFollowingBusiness(business.id) : false;
  const origin = serverEnv.APP_ORIGIN;

  return (
    <div className="space-y-6">
      <JsonLd data={businessJsonLd(business, origin)} />

      <p className="text-caption text-muted-foreground">Business profile · {business.name}</p>

      <Tabs defaultValue="overview" className="gap-6">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
          <div className="relative h-48 w-full bg-muted sm:h-64">
            {business.cover && (
              <Image
                src={business.cover.url}
                alt=""
                fill
                priority
                sizes="(min-width: 1440px) 1100px, 100vw"
                className="object-cover"
                unoptimized
              />
            )}
          </div>

          <div className="relative px-6 pt-0 pb-6 sm:px-8">
            <div className="mb-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <BusinessLogo
                  name={business.name}
                  url={business.logo?.url}
                  className="-mt-14 size-24 shrink-0 rounded-2xl bg-card shadow-md ring-4 ring-card sm:-mt-16"
                />
                <div className="space-y-1 pt-1 sm:pt-0 sm:pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-title-lg font-black text-foreground">{business.name}</h1>
                    {business.isVerified && (
                      <Badge className="bg-highlight-soft text-highlight">
                        <BadgeCheck aria-hidden />
                        Verified supplier
                      </Badge>
                    )}
                    {business.isPremium && <Badge variant="secondary">Premium</Badge>}
                  </div>
                  <p className="flex flex-wrap items-center gap-2 text-body-sm text-muted-foreground">
                    <span className="font-semibold text-primary">{business.category.name}</span>
                    <span aria-hidden>·</span>
                    <span>{BUSINESS_TYPE_LABELS[business.type]}</span>
                    <span aria-hidden>·</span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3.5" aria-hidden />
                      {business.city.name}, {business.state.name}
                    </span>
                    <span aria-hidden>·</span>
                    <span className="flex items-center gap-1">
                      <Star className="size-3.5 fill-warning text-warning" aria-hidden />
                      <span className="font-semibold text-foreground">{rating.value}</span>
                      <span>({rating.count})</span>
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 sm:items-end">
                <FollowButton
                  businessId={business.id}
                  initial={{ isFollowing, followerCount: business.followerCount }}
                  mode={!session ? 'guest' : isOwner ? 'owner' : 'viewer'}
                  returnTo={businessPath(business.slug)}
                />
                {session && !isOwner && (
                  <ReportButton
                    targetType="business"
                    targetId={business.id}
                    label="Report business"
                  />
                )}
                <ContactActions
                  layout="row"
                  subject={`General enquiry for ${business.name}`}
                  businessName={business.name}
                  businessId={business.id}
                  shareUrl={`${origin}${businessPath(business.slug)}`}
                />
              </div>
            </div>

            {business.contactPhone && (
              <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-border bg-success-soft p-3.5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-success">
                    <Phone className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-caption font-bold tracking-wider text-success uppercase">
                      Official contact number
                    </p>
                    <p className="text-body-sm font-extrabold text-foreground">
                      {business.contactPhone}
                    </p>
                  </div>
                </div>
                <a
                  href={`tel:${business.contactPhone}`}
                  className="inline-flex items-center gap-1.5 self-start rounded-lg border border-border bg-card px-3.5 py-1.5 text-caption font-bold text-success sm:self-auto"
                >
                  <Phone className="size-3.5" aria-hidden />
                  Call now
                </a>
              </div>
            )}
          </div>

          <div className="no-scrollbar overflow-x-auto border-t border-border bg-muted px-6 sm:px-8">
            <TabsList variant="line" aria-label="Business sections" className="h-auto">
              <TabsTrigger value="overview" className="py-3">
                Overview
              </TabsTrigger>
              <TabsTrigger value="products" className="py-3">
                Products ({tabCount(products)})
              </TabsTrigger>
              <TabsTrigger value="services" className="py-3">
                Services ({tabCount(services)})
              </TabsTrigger>
              <TabsTrigger value="posts" className="py-3">
                Posts{posts.data.length > 0 ? ` (${tabCount(posts)})` : ''}
              </TabsTrigger>
              <TabsTrigger value="reviews" className="py-3">
                Reviews ({reviews.rating.count})
              </TabsTrigger>
            </TabsList>
          </div>
        </section>

        {/*
         * Every tab is rendered on the server (forceMount) so its listings are in
         * the HTML for crawlers; inactive tabs are only hidden.
         */}
        <TabsContent value="overview" forceMount className="data-[state=inactive]:hidden">
          <Overview business={business} products={products.data} />
        </TabsContent>

        <TabsContent value="products" forceMount className="data-[state=inactive]:hidden">
          <ListingGrid
            listings={products.data.map((listing) => ({ kind: 'product' as const, listing }))}
            empty={
              <EmptyPanel
                icon={Package}
                title="No products listed yet"
                description="This business hasn't published any products."
              />
            }
          />
        </TabsContent>

        <TabsContent value="services" forceMount className="data-[state=inactive]:hidden">
          <ListingGrid
            listings={services.data.map((listing) => ({ kind: 'service' as const, listing }))}
            empty={
              <EmptyPanel
                icon={Wrench}
                title="No services listed yet"
                description="This business hasn't published any services."
              />
            }
          />
        </TabsContent>

        <TabsContent value="posts" forceMount className="data-[state=inactive]:hidden">
          <BusinessPosts
            businessId={business.id}
            initialPage={posts}
            isSignedIn={session !== null}
          />
        </TabsContent>

        <TabsContent value="reviews" forceMount className="data-[state=inactive]:hidden">
          <ReviewsTab
            businessId={business.id}
            initialPage={reviews}
            mode={!session ? 'guest' : isOwner ? 'owner' : 'viewer'}
            returnTo={businessPath(business.slug)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type GridItem = { kind: 'product'; listing: Product } | { kind: 'service'; listing: Service };

function ListingGrid({ listings, empty }: { listings: GridItem[]; empty: ReactNode }) {
  if (listings.length === 0) return empty;
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((item) => (
        <ListingCard key={item.listing.id} {...item} showBusiness={false} />
      ))}
    </div>
  );
}

function Overview({ business, products }: { business: Business; products: Product[] }) {
  const hours = openingHoursLines(business.openingHours);
  const socials = Object.entries(business.socials).filter((entry): entry is [string, string] =>
    Boolean(entry[1]),
  );
  const directions =
    business.mapUrl ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(businessAddress(business))}`;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className="space-y-3 rounded-2xl border border-border bg-card p-6 shadow-xs">
          <h2 className="text-body font-bold text-foreground">About {business.name}</h2>
          {business.about ? (
            <p className="text-body-sm whitespace-pre-line text-muted-foreground">
              {business.about}
            </p>
          ) : (
            <p className="text-body-sm text-muted-foreground">No description yet.</p>
          )}
          {business.tags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 pt-2">
              {business.tags.map((tag) => (
                <li key={tag}>
                  <Badge variant="outline">#{tag}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        {products.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-body font-bold text-foreground">Featured products</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {products.slice(0, 2).map((listing) => (
                <ListingCard
                  key={listing.id}
                  kind="product"
                  listing={listing}
                  showBusiness={false}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      <aside className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <h2 className="border-b border-border pb-3 text-body font-bold text-foreground">
          Business details
        </h2>
        <dl className="space-y-3 text-body-sm text-muted-foreground">
          {business.establishedYear && (
            <Detail icon={Building2} label="Established">
              {business.establishedYear}
            </Detail>
          )}
          <Detail icon={MapPin} label="Address">
            <span className="block">{businessAddress(business)}</span>
            <a
              href={directions}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-1.5 inline-flex items-center gap-1 rounded-lg border border-border bg-muted px-2.5 py-1 text-caption font-bold text-primary hover:bg-muted"
            >
              Get directions ↗
            </a>
          </Detail>
          {hours.length > 0 && (
            <Detail icon={Calendar} label="Opening hours">
              {hours.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </Detail>
          )}
          {business.gstin && (
            <Detail icon={ShieldCheck} label="GSTIN">
              <span className="font-mono">{business.gstin}</span>
            </Detail>
          )}
          {business.contactPerson && (
            <Detail icon={MessageSquareText} label="Contact person">
              {business.contactPerson}
            </Detail>
          )}
          {business.contactPhone && (
            <Detail icon={Phone} label="Phone">
              <a href={`tel:${business.contactPhone}`} className="font-semibold text-primary">
                {business.contactPhone}
              </a>
            </Detail>
          )}
          {business.contactEmail && (
            <Detail icon={Mail} label="Email">
              <a href={`mailto:${business.contactEmail}`} className="hover:text-primary">
                {business.contactEmail}
              </a>
            </Detail>
          )}
          {business.website && (
            <Detail icon={Globe} label="Website">
              <ExternalLink href={business.website} />
            </Detail>
          )}
          {socials.map(([network, url]) => (
            <Detail key={network} icon={Globe} label={SOCIAL_LABELS[network] ?? network}>
              <ExternalLink href={url} />
            </Detail>
          ))}
        </dl>
      </aside>
    </div>
  );
}

const SOCIAL_LABELS: Record<string, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  x: 'X',
};

/** Owner-entered links: http(s) only (validated by the API), and never followed for SEO. */
function ExternalLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      className="break-all text-primary hover:underline"
    >
      {href.replace(/^https?:\/\//, '')} ↗
    </a>
  );
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof MapPin;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0">
        <dt className="font-semibold text-foreground">{label}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  );
}
