import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getSession } from '@/dal/session';
import {
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  ArrowUpRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Lock,
} from 'lucide-react';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';

export const metadata: Metadata = {
  title: 'Admin Portal | Supporters',
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // Three-tier defense: role === 'admin', otherwise 404 per web spec line 98 & 179
  if (!session || session.role !== 'admin') {
    notFound();
  }

  const navItems = [
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'KYC Verifications', href: '/admin/verifications', icon: FileCheck2 },
    { label: 'Report Moderation', href: '/admin/reports', icon: AlertTriangle },
    { label: 'Withdrawal Approvals', href: '/admin/withdrawals', icon: ArrowUpRight },
    { label: 'Security Audit Logs', href: '/admin/audit-logs', icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-40 w-full bg-card/95 backdrop-blur-md border-b border-border shadow-2xs h-14 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-lg bg-destructive-soft text-destructive flex items-center justify-center font-bold text-xs">
            <Lock className="size-4" />
          </div>
          <span className="font-bold text-sm text-foreground">Supporters Administration</span>
          <Badge variant="outline" className="text-[10px] uppercase font-bold text-destructive border-destructive/30">
            Internal Portal
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-foreground">{session.name}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-mono">Role: {session.role}</p>
          </div>

          <Button variant="ghost" size="sm" asChild className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Link href="/admin/login">
              <LogOut className="size-3.5" />
              <span>Exit</span>
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border p-4 space-y-1 hidden md:block shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3">
            Management Queues
          </span>
          <div className="pt-1 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Icon className="size-4 shrink-0 text-primary" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Content View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">{children}</main>
      </div>
    </div>
  );
}
