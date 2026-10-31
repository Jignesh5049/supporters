import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyPanelProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

/** An empty tab or list, on design tokens (replaces the prototype's EmptyState here). */
export function EmptyPanel({ icon: Icon, title, description, action }: EmptyPanelProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
      <span className="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted text-primary">
        <Icon className="size-7" aria-hidden />
      </span>
      <h3 className="text-title-sm font-bold text-foreground">{title}</h3>
      <p className="max-w-sm text-body-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}
