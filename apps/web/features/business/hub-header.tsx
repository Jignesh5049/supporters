'use client';

import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { cn } from '@supporters/ui-web/lib/utils';
import {
  BadgeCheck,
  Building2,
  Eye,
  FileQuestion,
  FileText,
  Package,
  Pencil,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BusinessLogo } from '@/components/catalog/business-logo';

export interface HubBusiness {
  name: string;
  slug: string;
  city: string;
  state: string;
  logoUrl: string | null;
  isVerified: boolean;
}

/** Hub sections wired to the API. The others still use the prototype header. */
const LINKS = [
  { label: 'Overview', href: '/business/manage', icon: Building2 },
  { label: 'Edit profile', href: '/business/edit', icon: Pencil },
  { label: 'Products', href: '/business/products', icon: Package },
  { label: 'Services', href: '/business/services', icon: Wrench },
  { label: 'Posts', href: '/business/posts', icon: FileText },
  { label: 'Enquiries', href: '/business/enquiries', icon: FileQuestion },
  { label: 'Verification', href: '/business/verification', icon: BadgeCheck },
];

export function HubHeader({ business }: { business: HubBusiness }) {
  const pathname = usePathname();
  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-xs sm:p-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <BusinessLogo name={business.name} url={business.logoUrl} />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-body font-bold text-foreground">{business.name}</p>
              {business.isVerified && (
                <Badge className="bg-highlight-soft text-highlight">
                  <BadgeCheck aria-hidden />
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-caption text-muted-foreground">
              {business.city}, {business.state} · Business Hub
            </p>
          </div>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/business/${business.slug}`}>
            <Eye aria-hidden />
            View public page
          </Link>
        </Button>
      </div>
      <nav
        aria-label="Business Hub"
        className="no-scrollbar overflow-x-auto border-t border-border pt-2"
      >
        <ul className="flex items-center gap-1">
          {LINKS.map(({ label, href, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-3 py-1.5 text-caption font-bold whitespace-nowrap transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <Icon className="size-3.5" aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
