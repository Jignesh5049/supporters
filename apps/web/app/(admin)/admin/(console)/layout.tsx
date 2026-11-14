import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { PageSkeleton } from '@/components/catalog/page-skeleton';
import { requireAdmin } from '@/dal/admin';
import { AdminNav } from '@/features/admin/admin-nav';

/** The guard (web spec, Admin area): an admin session, or 404. The API checks again. */
async function AdminConsole({ children }: { children: ReactNode }) {
  const session = await requireAdmin();
  return (
    <div className="space-y-6">
      <AdminNav name={session.name} />
      {children}
    </div>
  );
}

export default function AdminConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AdminConsole>{children}</AdminConsole>
    </Suspense>
  );
}
