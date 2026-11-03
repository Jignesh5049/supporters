import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { notFound } from 'next/navigation';
import { HubHeader } from '@/features/business/hub-header';
import { toHubBusiness, toListingLimit } from '@/features/business/hub-mappers';
import { ListingForm } from '@/features/business/listing-form';
import { serviceToFormValues } from '@/features/business/listing-form-values';
import { getMyService, requireMyBusiness } from '@/dal/my-business';
import { getCategories, getStates } from '@/dal/reference';

export const metadata: Metadata = { title: 'Edit service', robots: { index: false } };

async function EditService({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await requireMyBusiness(`/business/services/${id}/edit`);
  const [service, categories, states] = await Promise.all([
    getMyService(id),
    getCategories(),
    getStates(),
  ]);
  if (!service) notFound();
  return (
    <div className="space-y-6">
      <HubHeader business={toHubBusiness(business)} />
      <h1 className="text-title font-bold text-foreground">Edit service</h1>
      <ListingForm
        kind="services"
        listingId={service.id}
        initialValues={serviceToFormValues(service)}
        categories={categories}
        states={states}
        limit={toListingLimit(business)}
      />
    </div>
  );
}

export default function EditServicePage({ params }: PageProps<'/business/services/[id]/edit'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditService params={params} />
    </Suspense>
  );
}
