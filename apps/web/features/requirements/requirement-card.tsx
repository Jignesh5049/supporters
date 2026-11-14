'use client';

import type { Requirement, RequirementStatus } from '@supporters/shared';
import { Badge } from '@supporters/ui-web/components/badge';
import { cn } from '@supporters/ui-web/lib/utils';
import { CalendarClock, CheckCircle2, IndianRupee, MapPin, Package, Pin } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  REQUIREMENT_STATUS_LABELS,
  requirementBudget,
  requirementQuantity,
  requirementTimeLeft,
  requirementTitle,
} from './requirement-form-values';

const STATUS_STYLES: Record<RequirementStatus, string> = {
  open: 'bg-success-soft text-success',
  closed: 'bg-muted text-muted-foreground',
  fulfilled: 'bg-highlight-soft text-highlight',
  expired: 'bg-warning-soft text-warning',
};

interface RequirementCardProps {
  requirement: Requirement;
  /** The pinned card at the top of a seller's feed. */
  isPinned?: boolean;
  /** Buttons under the card (Quote, Close, ...). */
  actions?: ReactNode;
}

/** A buyer requirement as sellers and the buyer see it. Never the buyer's phone or email. */
export function RequirementCard({ requirement, isPinned = false, actions }: RequirementCardProps) {
  const href = `/requirements/${requirement.id}`;
  return (
    <article
      aria-labelledby={`requirement-${requirement.id}`}
      className={cn(
        'space-y-3 rounded-2xl border bg-card p-5 shadow-xs',
        isPinned ? 'border-highlight' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {isPinned && (
          <Badge className="bg-highlight text-highlight-foreground">
            <Pin aria-hidden />
            Buyer requirement
          </Badge>
        )}
        <Badge variant="secondary">{requirement.category.name}</Badge>
        <Badge className={STATUS_STYLES[requirement.status]}>
          {REQUIREMENT_STATUS_LABELS[requirement.status]}
        </Badge>
        {requirement.hasQuoted && (
          <Badge className="bg-success-soft text-success">
            <CheckCircle2 aria-hidden />
            Quoted
          </Badge>
        )}
      </div>

      <h3 id={`requirement-${requirement.id}`} className="text-title-sm font-bold text-foreground">
        <Link href={href} className="hover:underline">
          {requirementTitle(requirement)}
        </Link>
      </h3>
      {requirement.description.trim() !== requirementTitle(requirement) && (
        <p className="line-clamp-3 text-body-sm whitespace-pre-line text-muted-foreground">
          {requirement.description}
        </p>
      )}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-body-sm sm:grid-cols-4">
        <Fact icon={Package} label="Quantity" value={requirementQuantity(requirement)} />
        <Fact icon={IndianRupee} label="Budget" value={requirementBudget(requirement)} />
        <Fact icon={MapPin} label="Deliver to" value={requirement.deliveryCity.name} />
        <Fact icon={CalendarClock} label="Status" value={requirementTimeLeft(requirement)} />
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
        <p className="text-caption text-muted-foreground">
          {requirement.isMine ? (
            <>
              Posted by you · {requirement.quoteCount}{' '}
              {requirement.quoteCount === 1 ? 'quote' : 'quotes'}
            </>
          ) : (
            <>
              {requirement.buyer.name}
              {requirement.buyer.city && ` · ${requirement.buyer.city.name}`}
            </>
          )}
        </p>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </article>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-caption text-muted-foreground">
        <Icon className="size-3.5" aria-hidden />
        {label}
      </dt>
      <dd className="truncate font-semibold text-foreground">{value}</dd>
    </div>
  );
}
