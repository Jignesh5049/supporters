import { LISTING_LIMITS } from '@supporters/shared';
import { Layers, Truck } from 'lucide-react';
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
import { getPublicProduct, listBusinessProducts } from '@/dal/catalog';
import { serverEnv } from '@/dal/config';
import {
  ASK_FOR_PRICE,
  PRODUCT_AVAILABILITY_LABELS,
  areaLabel,
  formatMoney,
  unitLabel,
} from '@/lib/catalog/format';
import {
  NOT_FOUND_METADATA,
  businessPath,
  listingMetadata,
  productJsonLd,
  productPath,
} from '@/lib/catalog/seo';

export async function generateMetadata({ params }: PageProps<'/product/[id]'>): Promise<Metadata> {
  const product = await getPublicProduct((await params).id);
  return product ? listingMetadata(product, serverEnv.APP_ORIGIN) : NOT_FOUND_METADATA;
}

export default function ProductDetailPage({ params }: PageProps<'/product/[id]'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProductDetail params={params} />
    </Suspense>
  );
}

async function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const product = await getPublicProduct((await params).id);
  if (!product) notFound();

  const origin = serverEnv.APP_ORIGIN;
  const unit = product.unit ? unitLabel(product.unit) : null;
  const more = (
    await listBusinessProducts(product.business.id, LISTING_LIMITS.relatedListings + 1)
  ).data
    .filter((other) => other.id !== product.id)
    .slice(0, LISTING_LIMITS.relatedListings);

  return (
    <div className="space-y-8">
      <JsonLd data={productJsonLd(product, origin)} />

      <div className="grid grid-cols-1 gap-8 rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <ListingGallery
            title={product.title}
            images={product.images}
            badge={PRODUCT_AVAILABILITY_LABELS[product.availability]}
          />
        </div>

        <div className="space-y-4 lg:col-span-4">
          <div>
            <p className="mb-1.5 text-caption font-bold tracking-wider text-highlight uppercase">
              {product.category.name}
            </p>
            <h1 className="text-title-lg font-black text-foreground">{product.title}</h1>
          </div>

          <div className="rounded-2xl border border-border bg-muted p-4">
            {product.price ? (
              <p className="flex flex-wrap items-baseline gap-2">
                <span className="text-title-lg font-black text-primary">
                  {formatMoney(product.price)}
                </span>
                {product.originalPrice && (
                  <s className="text-body-sm text-muted-foreground">
                    {formatMoney(product.originalPrice)}
                  </s>
                )}
                {unit && <span className="text-caption text-muted-foreground">/ {unit}</span>}
              </p>
            ) : (
              <p className="text-title font-black text-highlight">{ASK_FOR_PRICE}</p>
            )}
            {(product.moq || product.deliveryTime) && (
              <dl className="mt-2 grid grid-cols-2 gap-2 border-t border-border pt-2 text-caption">
                {product.moq && (
                  <div>
                    <dt className="text-muted-foreground">Minimum order</dt>
                    <dd className="font-bold text-foreground">
                      {product.moq} {unit}
                    </dd>
                  </div>
                )}
                {product.deliveryTime && (
                  <div>
                    <dt className="text-muted-foreground">Delivery time</dt>
                    <dd className="font-bold text-foreground">{product.deliveryTime}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>

          <section>
            <h2 className="mb-1.5 text-caption font-bold tracking-wider text-foreground uppercase">
              Product overview
            </h2>
            <p className="text-body-sm whitespace-pre-line text-muted-foreground">
              {product.description}
            </p>
          </section>

          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-info-soft p-3 text-caption">
            <Truck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <p>
              <span className="font-bold text-primary">Ships to: </span>
              <span className="text-muted-foreground">{areaLabel(product.shippingArea)}</span>
            </p>
          </div>
        </div>

        <div className="space-y-4 lg:col-span-3 lg:border-l lg:border-border lg:pl-6">
          <SellerCard business={product.business} />
          <ContactActions
            subject={product.title}
            businessName={product.business.name}
            businessId={product.business.id}
            shareUrl={`${origin}${productPath(product.id)}`}
          />
        </div>
      </div>

      {product.specs.length > 0 && (
        <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs sm:p-8">
          <h2 className="flex items-center gap-2 border-b border-border pb-3 text-body font-bold text-foreground">
            <Layers className="size-5 text-primary" aria-hidden />
            Specifications
          </h2>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 text-body-sm md:grid-cols-2">
            {product.specs.map((spec) => (
              <div
                key={spec.key}
                className="flex justify-between gap-4 border-b border-border py-2"
              >
                <dt className="font-medium text-muted-foreground">{spec.key}</dt>
                <dd className="text-right font-semibold text-foreground">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {more.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-body font-bold text-foreground">
              More from {product.business.name}
            </h2>
            <Link
              href={businessPath(product.business.slug)}
              className="text-caption font-semibold text-highlight hover:underline"
            >
              View catalog
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((listing) => (
              <ListingCard key={listing.id} kind="product" listing={listing} showBusiness={false} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
