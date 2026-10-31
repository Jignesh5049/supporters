import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { notFound } from 'next/navigation';
import { HubHeader } from '@/features/business/hub-header';
import { toHubBusiness, toListingLimit } from '@/features/business/hub-mappers';
import { ListingForm } from '@/features/business/listing-form';
import { productToFormValues } from '@/features/business/listing-form-values';
import { getMyProduct, requireMyBusiness } from '@/dal/my-business';
import { getCategories, getStates } from '@/dal/reference';

export const metadata: Metadata = { title: 'Edit product', robots: { index: false } };

async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const business = await requireMyBusiness(`/business/products/${id}/edit`);
  const [product, categories, states] = await Promise.all([
    getMyProduct(id),
    getCategories(),
    getStates(),
  ]);
  if (!product) notFound();
  return (
    <div className="space-y-6">
      <HubHeader business={toHubBusiness(business)} />
      <h1 className="text-title font-bold text-foreground">Edit product</h1>
      <ListingForm
        kind="products"
        listingId={product.id}
        initialValues={productToFormValues(product)}
        categories={categories}
        states={states}
        limit={toListingLimit(business)}
      />
    </div>
  );
}

export default function EditProductPage({ params }: PageProps<'/business/products/[id]/edit'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditProduct params={params} />
    </Suspense>
  );
}
