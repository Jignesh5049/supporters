import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { z } from 'zod';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { requireSession } from '@/dal/session';
import { RequirementDetail } from '@/features/requirements/requirement-detail';
import { getSellerState } from '../seller-state';

export const metadata: Metadata = { title: 'Buyer requirement', robots: { index: false } };

async function Requirement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSession(`/requirements/${id}`);
  if (!z.uuid().safeParse(id).success) notFound();
  const seller = await getSellerState();
  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-12">
      <h1 className="text-title font-bold text-foreground">Buyer requirement</h1>
      <RequirementDetail id={id} seller={seller} />
    </div>
  );
}

export default function RequirementPage({ params }: PageProps<'/requirements/[id]'>) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Requirement params={params} />
    </Suspense>
  );
}
