import type { Metadata } from 'next';
import { UsersTable } from '@/features/admin/users-table';

export const metadata: Metadata = { title: 'Users' };

export default function AdminUsersTablePage() {
  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-title font-bold text-foreground">Users</h1>
        <p className="text-caption text-muted-foreground">
          Suspending an account signs it out everywhere and takes its business and posts offline.
        </p>
      </div>
      <UsersTable />
    </section>
  );
}
