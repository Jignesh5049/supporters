import type { MyBusiness, Page, Product, Service } from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { Package, Plus, Wrench } from 'lucide-react';
import Link from 'next/link';
import { EmptyPanel } from '@/components/catalog/empty-panel';
import { HubHeader } from './hub-header';
import { toHubBusiness, toListingLimit, toListingRow } from './hub-mappers';
import { ListingLimitNotice, listingUsage } from './listing-limit';
import { ListingTable } from './listing-table';

interface HubListingPageProps {
  kind: 'products' | 'services';
  business: MyBusiness;
  page: Page<Product> | Page<Service>;
}

/** The Hub's product or service list: limit usage, the table, and "Add". */
export function HubListingPage({ kind, business, page }: HubListingPageProps) {
  const isProduct = kind === 'products';
  const limit = toListingLimit(business);
  const usage = listingUsage(limit);
  const rows = (page.data as (Product | Service)[]).map(toListingRow);

  return (
    <div className="space-y-6">
      <HubHeader business={toHubBusiness(business)} />

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="flex flex-col justify-between gap-3 border-b border-border pb-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-body font-bold text-foreground">
              {isProduct ? 'Products' : 'Services'}
            </h1>
            <p className="text-caption text-muted-foreground">
              {isProduct
                ? 'Prices, minimum orders, specifications and photos'
                : 'Starting prices, service areas and photos'}
              {usage && ` · ${usage}`}
            </p>
          </div>
          <Button asChild size="sm" className="self-start sm:self-auto">
            <Link href={`/business/${kind}/new`}>
              <Plus aria-hidden />
              {isProduct ? 'Add product' : 'Add service'}
            </Link>
          </Button>
        </div>

        <ListingLimitNotice limit={limit} />

        {rows.length === 0 ? (
          <EmptyPanel
            icon={isProduct ? Package : Wrench}
            title={isProduct ? 'No products yet' : 'No services yet'}
            description={
              isProduct
                ? 'Add your first product so buyers can find it on your page and in search.'
                : 'Add your first service so buyers can find it on your page and in search.'
            }
          />
        ) : (
          <ListingTable kind={kind} rows={rows} />
        )}
        {page.nextCursor && (
          <p className="text-caption text-muted-foreground">
            Showing the first {rows.length}. Paging through the rest comes next.
          </p>
        )}
      </section>
    </div>
  );
}
