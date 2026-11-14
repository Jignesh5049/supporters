import type { Metadata } from 'next';
import { ReportQueue } from '@/features/admin/report-queue';

export const metadata: Metadata = { title: 'Reports' };

export default function AdminReportQueuePage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-title font-bold text-foreground">Reports</h1>
        <p className="text-caption text-muted-foreground">
          Posts and comments with 5 open reports are already hidden and wait here for a decision.
        </p>
      </div>
      <ReportQueue />
    </section>
  );
}
