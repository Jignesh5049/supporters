import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { HubHeader } from '@/features/business/hub-header';
import { toHubBusiness, toListingLimit } from '@/features/business/hub-mappers';
import { ListingForm } from '@/features/business/listing-form';
import { EMPTY_SERVICE_FORM } from '@/features/business/listing-form-values';
import { requireMyBusiness } from '@/dal/my-business';
import { getCategories, getStates } from '@/dal/reference';

export const metadata: Metadata = { title: 'Add a service', robots: { index: false } };

async function NewService() {
  const business = await requireMyBusiness('/business/services/new');
  const [categories, states] = await Promise.all([getCategories(), getStates()]);
  return (
    <div className="space-y-6">
      <HubHeader business={toHubBusiness(business)} />
      <h1 className="text-title font-bold text-foreground">Add a service</h1>
      <ListingForm
        kind="services"
        listingId={null}
        initialValues={EMPTY_SERVICE_FORM}
        categories={categories}
        states={states}
        limit={toListingLimit(business)}
      />
    </div>
  );
}

export default function NewServicePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewService />
    </Suspense>
  );
}
