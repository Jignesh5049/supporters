import type { Metadata } from 'next';
import { WithdrawalQueue } from '@/features/admin/withdrawal-queue';

export const metadata: Metadata = { title: 'Withdrawals' };

export default function AdminWithdrawalQueuePage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-title font-bold text-foreground">Withdrawals</h1>
        <p className="text-caption text-muted-foreground">
          Approve or reject within 3 working days. Check any request flagged for a name mismatch
          before paying out.
        </p>
      </div>
      <WithdrawalQueue />
    </section>
  );
}
