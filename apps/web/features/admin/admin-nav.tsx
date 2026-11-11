'use client';

import { Button } from '@supporters/ui-web/components/button';
import { cn } from '@supporters/ui-web/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminApi } from './admin-api';

const LINKS = [
  { href: '/admin/verifications', label: 'Verifications' },
  { href: '/admin/reports', label: 'Reports' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/audit-logs', label: 'Audit log' },
];

export function AdminNav({ name }: { name: string }) {
  const pathname = usePathname();
  const handleSignOut = async () => {
    await adminApi.logout().catch(() => undefined);
    // A full load, not a client navigation, so no admin data stays in memory after sign-out.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign('/admin/login');
  };
  return (
    <nav
      aria-label="Admin"
      className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3"
    >
      <span className="mr-2 text-body font-bold text-foreground">Admin</span>
      {LINKS.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'rounded-lg px-3 py-2 text-caption font-semibold',
              isActive ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted',
            )}
          >
            {link.label}
          </Link>
        );
      })}
      <span className="ml-auto text-caption text-muted-foreground">{name}</span>
      <Button type="button" variant="outline" size="sm" onClick={handleSignOut}>
        Sign out
      </Button>
    </nav>
  );
}
