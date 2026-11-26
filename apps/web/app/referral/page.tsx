import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { requireSession } from '@/dal/session';
import { ReferralScreen } from '@/features/wallet/referral-screen';

export const metadata: Metadata = { title: 'Refer and earn', robots: { index: false } };

async function Referral() {
  await requireSession('/referral');
  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-12">
      <div>
        <h1 className="text-title font-bold text-foreground">Refer and earn</h1>
        <p className="text-body-sm text-muted-foreground">
          Invite a business to Supporters. When they buy Premium, you earn.
        </p>
      </div>
      <ReferralScreen />
    </div>
  );
}

export default function ReferralPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Referral />
    </Suspense>
  );
}
