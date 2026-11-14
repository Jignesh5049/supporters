import type { Metadata } from 'next';
import { VerificationQueue } from '@/features/admin/verification-queue';

export const metadata: Metadata = { title: 'Verifications' };

export default function AdminVerificationQueuePage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-title font-bold text-foreground">Verifications</h1>
        <p className="text-caption text-muted-foreground">
          Check the number on the government portal, then approve or reject with a reason within 2
          working days.
        </p>
      </div>
      <VerificationQueue />
    </section>
  );
}
