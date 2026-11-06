import React from 'react';
import Link from 'next/link';
import {
  EmptyState as PatternEmptyState,
  type EmptyStateProps as PatternProps,
} from '@supporters/ui-web/patterns/empty-state';

export interface EmptyStateProps extends Omit<PatternProps, 'renderLink'> {}

export function EmptyState(props: EmptyStateProps) {
  return (
    <PatternEmptyState
      {...props}
      renderLink={({ href, className, children }) => (
        <Link href={href} className={className}>
          {children}
        </Link>
      )}
    />
  );
}
