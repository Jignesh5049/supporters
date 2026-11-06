import * as React from 'react';
import { type LucideIcon, Inbox } from 'lucide-react';
import { cn } from '@supporters/ui-web/lib/utils';
import { Button } from '@supporters/ui-web/components/button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
  renderLink?: (props: { href: string; className?: string; children: React.ReactNode }) => React.ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
  renderLink,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-card rounded-2xl border border-border',
        className,
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center text-primary mb-4 shadow-xs">
        <Icon className="w-7 h-7 stroke-[1.75]" />
      </div>
      <h3 className="text-base font-bold text-foreground max-w-sm">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mt-1.5 leading-relaxed">{description}</p>

      {actionLabel && actionHref && (
        renderLink ? (
          renderLink({
            href: actionHref,
            className: 'mt-5',
            children: <Button size="default">{actionLabel}</Button>,
          })
        ) : (
          <a href={actionHref} className="mt-5">
            <Button size="default">{actionLabel}</Button>
          </a>
        )
      )}

      {actionLabel && onAction && !actionHref && (
        <Button onClick={onAction} size="default" className="mt-5">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
