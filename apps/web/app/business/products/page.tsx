import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { HubListingPage } from '@/features/business/hub-listing-page';
import { listMyProducts, requireMyBusiness } from '@/dal/my-business';

export const metadata: Metadata = { title: 'My products', robots: { index: false } };

async function ProductsList() {
  const business = await requireMyBusiness('/business/products');
  const page = await listMyProducts();
  return <HubListingPage kind="products" business={business} page={page} />;
}

export default function BusinessProductsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProductsList />
    </Suspense>
  );
}
