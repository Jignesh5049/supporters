import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { BusinessForm } from '@/features/business/business-form';
import { businessToFormValues } from '@/features/business/business-form-values';
import { HubHeader } from '@/features/business/hub-header';
import { toHubBusiness } from '@/features/business/hub-mappers';
import { requireMyBusiness } from '@/dal/my-business';
import { getCategories, getStates } from '@/dal/reference';

export const metadata: Metadata = { title: 'Edit business profile', robots: { index: false } };

async function EditBusiness() {
  const business = await requireMyBusiness('/business/edit');
  const [categories, states] = await Promise.all([getCategories(), getStates()]);
  return (
    <div className="space-y-6">
      <HubHeader business={toHubBusiness(business)} />
      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-end">
        <h1 className="text-title font-bold text-foreground">Edit business profile</h1>
        <p className="text-caption text-muted-foreground">
          Profile {business.profileCompletion}% complete
        </p>
      </div>
      <BusinessForm
        mode="update"
        categories={categories}
        states={states}
        initialValues={businessToFormValues(business)}
        initialLogo={business.logo}
        initialCover={business.cover}
      />
    </div>
  );
}

export default function EditBusinessPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <EditBusiness />
    </Suspense>
  );
}
