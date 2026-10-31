import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { HubListingPage } from '@/features/business/hub-listing-page';
import { listMyServices, requireMyBusiness } from '@/dal/my-business';

export const metadata: Metadata = { title: 'My services', robots: { index: false } };

async function ServicesList() {
  const business = await requireMyBusiness('/business/services');
  const page = await listMyServices();
  return <HubListingPage kind="services" business={business} page={page} />;
}

export default function BusinessServicesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ServicesList />
    </Suspense>
  );
}
