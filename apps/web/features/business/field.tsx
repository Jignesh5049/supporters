'use client';

import { Label } from '@supporters/ui-web/components/label';
import { useId, type ReactNode } from 'react';

export interface ControlProps {
  id: string;
  'aria-invalid'?: true;
  'aria-describedby'?: string;
}

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  className?: string;
  /** Renders the control with its id and ARIA links. */
  children: (control: ControlProps) => ReactNode;
}

/** A labelled control with its hint and error linked by `aria-describedby`. */
export function Field({ label, error, hint, className, children }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className ?? 'space-y-1.5'}>
      <Label htmlFor={id}>{label}</Label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': describedBy,
      })}
      {hint && (
        <p id={hintId} className="text-caption text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

/** A titled group of fields inside a form. */
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-xs">
      <h2 className="border-b border-border pb-3 text-body font-bold text-foreground">{title}</h2>
      {children}
    </section>
  );
}
