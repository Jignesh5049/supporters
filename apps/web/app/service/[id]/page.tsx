import { LISTING_LIMITS } from '@supporters/shared';
import { CheckCircle2, MapPin } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ContactActions } from '@/components/catalog/contact-actions';
import { JsonLd } from '@/components/catalog/json-ld';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { ListingCard } from '@/components/catalog/listing-card';
import { ListingGallery } from '@/components/catalog/listing-gallery';
import { SellerCard } from '@/components/catalog/seller-card';
import { getPublicService, listBusinessServices } from '@/dal/catalog';
import { serverEnv } from '@/dal/config';
import {
  ASK_FOR_PRICE,
  SERVICE_AVAILABILITY_LABELS,
  areaLabel,
  formatMoney,
  priceUnitLabel,
} from '@/lib/catalog/format';
import {
  NOT_FOUND_METADATA,
  businessPath,
  listingMetadata,
  serviceJsonLd,
  servicePath,
} from '@/lib/catalog/seo';

export async function generateMetadata({ params }: PageProps<'/service/[id]'>): Promise<Metadata> {
  const service = await getPublicService((await params).id);
  return service ? listingMetadata(service, serverEnv.APP_ORIGIN) : NOT_FOUND_METADATA;
}

export default function ServiceDetailPage({ params }: PageProps<'/service/[id]'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ServiceDetail params={params} />
    </Suspense>
  );
}

async function ServiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const service = await getPublicService((await params).id);
  if (!service) notFound();

  const origin = serverEnv.APP_ORIGIN;
  const more = (
    await listBusinessServices(service.business.id, LISTING_LIMITS.relatedListings + 1)
  ).data
    .filter((other) => other.id !== service.id)
    .slice(0, LISTING_LIMITS.relatedListings);

  return (
    <div className="space-y-8">
      <JsonLd data={serviceJsonLd(service, origin)} />

      <div className="grid grid-cols-1 gap-8 rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <ListingGallery
            title={service.title}
            images={service.images}
            badge={SERVICE_AVAILABILITY_LABELS[service.availability]}
          />
        </div>

        <div className="space-y-4 lg:col-span-4">
          <div>
            <p className="mb-1.5 text-caption font-bold tracking-wider text-highlight uppercase">
              {service.category.name}
            </p>
            <h1 className="text-title-lg font-black text-foreground">{service.title}</h1>
          </div>

          <div className="rounded-2xl border border-border bg-muted p-4">
            {service.price ? (
              <p className="flex flex-wrap items-baseline gap-2">
                <span className="text-caption text-muted-foreground">Starting from</span>
                <span className="text-title-lg font-black text-primary">
                  {formatMoney(service.price)}
                </span>
                {service.priceUnit && (
                  <span className="text-caption text-muted-foreground">
                    {priceUnitLabel(service.priceUnit)}
                  </span>
                )}
              </p>
            ) : (
              <p className="text-title font-black text-highlight">{ASK_FOR_PRICE}</p>
            )}
            {service.turnaround && (
              <dl className="mt-2 border-t border-border pt-2 text-caption">
                <dt className="text-muted-foreground">Turnaround</dt>
                <dd className="font-bold text-foreground">{service.turnaround}</dd>
              </dl>
            )}
          </div>

          <section>
            <h2 className="mb-1.5 text-caption font-bold tracking-wider text-foreground uppercase">
              Service overview
            </h2>
            <p className="text-body-sm whitespace-pre-line text-muted-foreground">
              {service.description}
            </p>
          </section>

          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-info-soft p-3 text-caption">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p>
              <span className="font-bold text-primary">Service area: </span>
              <span className="text-muted-foreground">{areaLabel(service.serviceArea)}</span>
            </p>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-3 lg:border-l lg:border-border lg:pl-6">
          <SellerCard business={service.business} />
          <ContactActions
            subject={service.title}
            businessName={service.business.name}
            businessId={service.business.id}
            listing={{ type: 'service', id: service.id }}
            shareUrl={`${origin}${servicePath(service.id)}`}
          />
        </div>
      </div>

      {service.features.length > 0 && (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8">
          <h2 className="border-b border-border pb-3 text-body font-bold text-foreground">
            What&apos;s included
          </h2>
          <ul className="grid grid-cols-1 gap-3 text-body-sm md:grid-cols-2">
            {service.features.map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                {feature}
              </li>
            ))}
          </ul>
        </section>
      )}

      {more.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-body font-bold text-foreground">
              More from {service.business.name}
            </h2>
            <Link
              href={businessPath(service.business.slug)}
              className="text-caption font-semibold text-highlight hover:underline"
            >
              View catalog
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((listing) => (
              <ListingCard key={listing.id} kind="service" listing={listing} showBusiness={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
