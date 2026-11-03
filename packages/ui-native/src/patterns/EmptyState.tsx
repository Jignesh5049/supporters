import * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { Button } from '@supporters/ui-native/components/button';
import { Text } from '@supporters/ui-native/components/text';
import { cn } from '@supporters/ui-native/lib/utils';

export interface EmptyStateProps extends ViewProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <View
      className={cn(
        'bg-card border-border flex flex-col items-center justify-center rounded-2xl border p-8 text-center shadow-sm',
        className,
      )}
      accessibilityRole="region"
      {...props}
    >
      {icon ? <View className="mb-4 flex items-center justify-center">{icon}</View> : null}
      <Text variant="large" className="text-center font-bold">
        {title}
      </Text>
      {description ? (
        <Text variant="muted" className="mt-2 text-center text-sm leading-relaxed">
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button variant="default" size="sm" className="mt-6" onPress={onAction}>
          <Text>{actionLabel}</Text>
        </Button>
      ) : null}
    </View>
  );
}
