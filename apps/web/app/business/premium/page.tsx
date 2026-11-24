import { premiumStatusSchema } from '@supporters/shared';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { apiGet } from '@/dal/api-fetch';
import { requireMyBusiness } from '@/dal/my-business';
import { HubHeader } from '@/features/business/hub-header';
import { toHubBusiness } from '@/features/business/hub-mappers';
import { PremiumPanel } from '@/features/premium/premium-panel';

export const metadata: Metadata = { title: 'Premium', robots: { index: false } };

async function Premium() {
  const business = await requireMyBusiness('/business/premium');
  const status = await apiGet('/v1/me/business/premium', premiumStatusSchema, {
    withSession: true,
  });
  if (!status) throw new Error('Premium status is unavailable');
  // The nonce proxy.ts put on this request: Razorpay's script must carry it to run under the CSP.
  const nonce = (await headers()).get('x-nonce') ?? '';
  return (
    <div className="space-y-6">
      <HubHeader business={toHubBusiness(business)} />
      <div className="space-y-1">
        <h1 className="text-h3 font-bold text-foreground">Premium</h1>
        <p className="text-caption text-muted-foreground">
          Premium belongs to {business.name}. It is bought on the web; the app shows its status.
        </p>
      </div>
      <PremiumPanel initial={status} nonce={nonce} />
    </div>
  );
}

export default function BusinessPremiumPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Premium />
    </Suspense>
  );
}
