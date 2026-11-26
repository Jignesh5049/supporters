import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { requireSession } from '@/dal/session';
import { WalletScreen } from '@/features/wallet/wallet-screen';

export const metadata: Metadata = { title: 'Wallet', robots: { index: false } };

async function Wallet() {
  await requireSession('/wallet');
  return (
    <div className="mx-auto max-w-3xl space-y-5 pb-12">
      <h1 className="text-title font-bold text-foreground">Wallet</h1>
      <WalletScreen />
    </div>
  );
}

export default function WalletPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Wallet />
    </Suspense>
  );
}
