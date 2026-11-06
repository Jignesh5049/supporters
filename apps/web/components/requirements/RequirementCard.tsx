import React from 'react';
import Link from 'next/link';
import { type BuyerRequirement } from '@supporters/shared';
import { Card } from '@supporters/ui-web/components/card';
import { Badge } from '@supporters/ui-web/components/badge';
import { Button } from '@supporters/ui-web/components/button';
import { MapPin, Package, Clock, IndianRupee, ArrowRight, MessageSquareQuote } from 'lucide-react';

interface RequirementCardProps {
  requirement: BuyerRequirement;
}

export function RequirementCard({ requirement }: RequirementCardProps) {
  const urgencyVariants: Record<string, { label: string; variant: 'destructive' | 'default' | 'secondary' }> = {
    immediate: { label: 'Immediate Need', variant: 'destructive' },
    standard: { label: 'Standard Delivery', variant: 'default' },
    flexible: { label: 'Flexible Timeline', variant: 'secondary' },
  };

  const urgency = urgencyVariants[requirement.urgency] ?? urgencyVariants.standard;

  return (
    <Card className="p-5 flex flex-col justify-between hover:shadow-xs transition-all border-border bg-card rounded-2xl group">
      <div>
        {/* Header: Urgency & Category */}
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <Badge variant={urgency.variant} className="text-[11px] px-2 py-0.5">
            {urgency.label}
          </Badge>
          {requirement.categoryName && (
            <span className="text-xs text-muted-foreground font-medium">
              {requirement.categoryName}
            </span>
          )}
        </div>

        {/* Title */}
        <Link href={`/requirements?id=${requirement.id}`}>
          <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
            {requirement.title}
          </h3>
        </Link>

        {/* Description snippet */}
        <p className="text-xs text-muted-foreground line-clamp-3 mt-1.5 leading-relaxed">
          {requirement.description}
        </p>

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Package className="size-3.5 text-primary shrink-0" />
            <span className="truncate">
              {requirement.quantity.toLocaleString('en-IN')} {requirement.unit}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-info shrink-0" />
            <span className="truncate">
              {requirement.deliveryCity}
              {requirement.deliveryState ? `, ${requirement.deliveryState}` : ''}
            </span>
          </div>

          {requirement.targetBudgetPaise && (
            <div className="flex items-center gap-1.5">
              <IndianRupee className="size-3.5 text-success shrink-0" />
              <span className="truncate font-semibold text-foreground">
                Budget: ₹{(requirement.targetBudgetPaise / 100).toLocaleString('en-IN')}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">Active listing</span>
          </div>
        </div>
      </div>

      {/* Footer / Quote action */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {requirement.quotesCount} {requirement.quotesCount === 1 ? 'quote' : 'quotes'} received
        </span>

        <Button size="sm" asChild className="text-xs font-semibold h-8 gap-1 shadow-xs">
          <Link href={`/requirements?id=${requirement.id}`}>
            <MessageSquareQuote className="size-3.5" />
            <span>Send Quote</span>
          </Link>
        </Button>
      </div>
    </Card>
  );
}
