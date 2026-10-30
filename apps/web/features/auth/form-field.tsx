'use client';

import { Input } from '@supporters/ui-web/components/input';
import { Label } from '@supporters/ui-web/components/label';
import { useId, type ComponentProps, type ReactNode } from 'react';

interface FormFieldProps extends ComponentProps<typeof Input> {
  label: string;
  error?: string;
  /** Rendered beside the label, e.g. a "Forgot password?" link. */
  labelAside?: ReactNode;
}

/** A labelled input whose error is linked with `aria-describedby` and announced. */
export function FormField({ label, error, labelAside, id, ...inputProps }: FormFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={inputId}>{label}</Label>
        {labelAside}
      </div>
      <Input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** Errors from the API that belong to the whole form. */
export function FormError({ message }: { message: string | null }) {
  return (
    <p role="alert" aria-live="assertive" className="text-sm text-destructive empty:hidden">
      {message}
    </p>
  );
}
