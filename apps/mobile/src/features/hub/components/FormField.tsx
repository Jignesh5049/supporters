import React from 'react';
import { View } from 'react-native';
import { Label } from '@supporters/ui-native/components/label';
import { Text } from '@supporters/ui-native/components/text';

interface FormFieldProps {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}

/** A label above an input, with an optional hint and error line. */
export function FormField({ label, hint, error, children }: FormFieldProps) {
  return (
    <View className="gap-1.5">
      <Label>{label}</Label>
      {children}
      {hint ? (
        <Text variant="muted" className="text-xs">
          {hint}
        </Text>
      ) : null}
      {error ? (
        <Text className="text-destructive text-xs" role="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
