import type { Metadata } from 'next';
import { AuditLogTable } from '@/features/admin/audit-log-table';

export const metadata: Metadata = { title: 'Audit log' };

export default function AdminAuditLogPage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-title font-bold text-foreground">Audit log</h1>
        <p className="text-caption text-muted-foreground">
          Every admin action and read. Entries cannot be edited or deleted.
        </p>
      </div>
      <AuditLogTable />
    </section>
  );
}
