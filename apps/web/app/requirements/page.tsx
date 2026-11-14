import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { requireSession } from '@/dal/session';
import { RequirementsScreen } from '@/features/requirements/requirements-screen';
import { getSellerState } from './seller-state';

export const metadata: Metadata = { title: 'Buyer requirements', robots: { index: false } };

async function Requirements() {
  await requireSession('/requirements');
  const seller = await getSellerState();
  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-12">
      <div>
        <h1 className="text-title font-bold text-foreground">Buyer requirements</h1>
        <p className="text-body-sm text-muted-foreground">
          Post what you need and let suppliers come to you, or quote on what buyers need.
        </p>
      </div>
      <RequirementsScreen seller={seller} />
    </div>
  );
}

export default function RequirementsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Requirements />
    </Suspense>
  );
}
