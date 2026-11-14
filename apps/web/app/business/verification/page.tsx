import { myVerificationSchema } from '@supporters/shared';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { apiGet } from '@/dal/api-fetch';
import { requireMyBusiness } from '@/dal/my-business';
import { HubHeader } from '@/features/business/hub-header';
import { toHubBusiness } from '@/features/business/hub-mappers';
import { VerificationRequest } from '@/features/business/verification-request';

export const metadata: Metadata = { title: 'Verification', robots: { index: false } };

async function Verification() {
  const business = await requireMyBusiness('/business/verification');
  const verification = (await apiGet('/v1/me/business/verification', myVerificationSchema, {
    withSession: true,
  })) ?? { status: business.verificationStatus, request: null };
  return (
    <div className="space-y-6">
      <HubHeader business={toHubBusiness(business)} />
      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
        <div className="border-b border-border pb-3">
          <h1 className="text-body font-bold text-foreground">Verification</h1>
          <p className="text-caption text-muted-foreground">
            The Verified badge tells buyers we checked your registration. Only verified businesses
            can quote on buyer requirements.
          </p>
        </div>
        <VerificationRequest initial={verification} />
      </section>
    </div>
  );
}

export default function BusinessVerificationPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Verification />
    </Suspense>
  );
}
