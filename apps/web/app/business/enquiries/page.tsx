import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { requireMyBusiness } from '@/dal/my-business';
import { HubHeader } from '@/features/business/hub-header';
import { toHubBusiness } from '@/features/business/hub-mappers';
import { BusinessEnquiries } from '@/features/messaging/enquiry-list';

export const metadata: Metadata = { title: 'Enquiries', robots: { index: false } };

async function Enquiries() {
  const business = await requireMyBusiness('/business/enquiries');
  return (
    <div className="space-y-6">
      <HubHeader business={toHubBusiness(business)} />
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="border-b border-border pb-3">
          <h1 className="text-body font-bold text-foreground">Enquiries</h1>
          <p className="text-caption text-muted-foreground">
            Contact Supplier requests from buyers. Your first reply marks an enquiry Responded.
          </p>
        </div>
        <BusinessEnquiries />
      </section>
    </div>
  );
}

export default function BusinessEnquiriesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Enquiries />
    </Suspense>
  );
}
