import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { requireSession } from '@/dal/session';
import { MyEnquiries } from '@/features/messaging/enquiry-list';

export const metadata: Metadata = { title: 'My enquiries', robots: { index: false } };

async function Enquiries() {
  await requireSession('/enquiries');
  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-12">
      <div>
        <h1 className="text-title font-bold text-foreground">My enquiries</h1>
        <p className="text-body-sm text-muted-foreground">
          Enquiries you sent to suppliers, and where each one stands.
        </p>
      </div>
      <MyEnquiries />
    </div>
  );
}

export default function EnquiriesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Enquiries />
    </Suspense>
  );
}
