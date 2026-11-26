import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { requireSession } from '@/dal/session';
import { WithdrawScreen } from '@/features/wallet/withdraw-screen';

export const metadata: Metadata = { title: 'Withdraw', robots: { index: false } };

async function Withdraw() {
  await requireSession('/wallet/withdraw');
  return (
    <div className="mx-auto max-w-xl space-y-5 pb-12">
      <div>
        <Link href="/wallet" className="text-body-sm font-semibold text-primary underline">
          Back to wallet
        </Link>
        <h1 className="text-title font-bold text-foreground">Withdraw money</h1>
      </div>
      <WithdrawScreen />
    </div>
  );
}

export default function WithdrawPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Withdraw />
    </Suspense>
  );
}
