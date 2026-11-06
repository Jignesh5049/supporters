import React from 'react';
import { Badge as UiBadge } from '@supporters/ui-web/components/badge';
import { cn } from '@supporters/ui-web/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | 'primary'
    | 'secondary'
    | 'accent'
    | 'neutral'
    | 'success'
    | 'outline'
    | 'destructive'
    | 'default';
  size?: 'sm' | 'md';
  className?: string;
}

export function Badge({ children, variant = 'neutral', size = 'md', className = '' }: BadgeProps) {
  const variantMap: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    primary: 'default',
    secondary: 'secondary',
    accent: 'secondary',
    neutral: 'secondary',
    success: 'outline',
    outline: 'outline',
    destructive: 'destructive',
    default: 'default',
  };

  const resolvedVariant = variantMap[variant] ?? 'default';

  return (
    <UiBadge
      variant={resolvedVariant}
      className={cn(
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1',
        variant === 'success' && 'border-success text-success bg-success-soft',
        variant === 'accent' && 'border-highlight text-highlight bg-highlight-soft',
        className,
      )}
    >
      {children}
    </UiBadge>
  );
}
