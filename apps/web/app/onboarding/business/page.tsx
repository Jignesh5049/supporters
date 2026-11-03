import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { redirect } from 'next/navigation';
import { BusinessForm } from '@/features/business/business-form';
import { getMyBusiness } from '@/dal/my-business';
import { getCategories, getStates } from '@/dal/reference';

export const metadata: Metadata = { title: 'Create your business page', robots: { index: false } };

/** Product spec, Signup step 5: any user can add one business page. The layout checks the session. */
async function BusinessOnboarding() {
  if (await getMyBusiness()) redirect('/business/edit');
  const [categories, states] = await Promise.all([getCategories(), getStates()]);
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <div className="space-y-1 text-center">
        <p className="text-caption font-bold tracking-wider text-highlight uppercase">
          Business page
        </p>
        <h1 className="text-title-lg font-black text-foreground">Create your business page</h1>
        <p className="text-body-sm text-muted-foreground">
          Buyers find you by name, category and city. You can add the rest later.
        </p>
      </div>
      <BusinessForm mode="create" categories={categories} states={states} />
    </div>
  );
}

export default function BusinessOnboardingPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BusinessOnboarding />
    </Suspense>
  );
}
