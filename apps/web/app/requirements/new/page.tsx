import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { getCategories, getStates } from '@/dal/reference';
import { requireSession } from '@/dal/session';
import { RequirementForm } from '@/features/requirements/requirement-form';

export const metadata: Metadata = { title: 'Post a requirement', robots: { index: false } };

async function NewRequirement() {
  await requireSession('/requirements/new');
  const [categories, states] = await Promise.all([getCategories(), getStates()]);
  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-12">
      <div>
        <h1 className="text-title font-bold text-foreground">Post a requirement</h1>
        <p className="text-body-sm text-muted-foreground">
          Suppliers in this category who deliver to your city will see it and can send quotes.
        </p>
      </div>
      <RequirementForm categories={categories} states={states} />
    </div>
  );
}

export default function NewRequirementPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewRequirement />
    </Suspense>
  );
}
