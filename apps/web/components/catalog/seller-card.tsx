import type { BusinessSummary } from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { ArrowRight, BadgeCheck, MapPin } from 'lucide-react';
import Link from 'next/link';
import { businessPath } from '@/lib/catalog/seo';
import { BusinessLogo } from './business-logo';

/** The supplier box beside a listing. */
export function SellerCard({ business }: { business: BusinessSummary }) {
  return (
    <section
      aria-label="Supplier"
      className="space-y-3 rounded-2xl border border-border bg-muted p-4"
    >
      <p className="text-caption font-bold tracking-wider text-muted-foreground uppercase">
        Supplier
      </p>
      <div className="flex items-center gap-3">
        <BusinessLogo name={business.name} url={business.logo?.url} />
        <div className="min-w-0">
          <Link
            href={businessPath(business.slug)}
            className="line-clamp-1 text-body-sm font-bold text-foreground hover:text-primary"
          >
            {business.name}
          </Link>
          {business.isVerified && (
            <p className="flex items-center gap-1 text-caption font-semibold text-highlight">
              <BadgeCheck className="size-3.5" aria-hidden />
              Verified supplier
            </p>
          )}
        </div>
      </div>
      <p className="flex items-center gap-2 text-caption text-muted-foreground">
        <MapPin className="size-3.5 text-primary" aria-hidden />
        {business.city.name}
      </p>
      <Button asChild variant="outline" size="sm" className="w-full">
        <Link href={businessPath(business.slug)}>
          View business profile
          <ArrowRight aria-hidden />
        </Link>
      </Button>
    </section>
  );
}
