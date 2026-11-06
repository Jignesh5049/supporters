'use client';

import React from 'react';
import {
  Avatar as UiAvatar,
  AvatarImage,
  AvatarFallback,
} from '@supporters/ui-web/components/avatar';
import { cn } from '@supporters/ui-web/lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  verified?: boolean;
  className?: string;
}

export function Avatar({
  src,
  name,
  size = 'md',
  verified = false,
  className = '',
}: AvatarProps) {
  const sizeMap: Record<string, string> = {
    xs: 'size-6 text-[10px]',
    sm: 'size-8 text-xs',
    md: 'size-10 text-sm',
    lg: 'size-12 text-base',
    xl: 'size-16 text-xl',
  };

  const getInitials = (n: string) => {
    return n
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className={cn('relative inline-block shrink-0', className)}>
      <UiAvatar
        className={cn(
          'rounded-full bg-muted border border-border flex items-center justify-center font-semibold text-primary select-none',
          sizeMap[size] ?? sizeMap.md,
        )}
      >
        {src && <AvatarImage src={src} alt={name} className="object-cover" />}
        <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
          {getInitials(name) || 'U'}
        </AvatarFallback>
      </UiAvatar>
      {verified && (
        <span
          className="absolute -bottom-0.5 -right-0.5 bg-background text-info rounded-full p-0.5 shadow-xs flex items-center justify-center"
          title="Verified on Supporters"
        >
          <CheckCircle2 className="w-3 h-3 fill-current" />
        </span>
      )}
    </div>
  );
}
