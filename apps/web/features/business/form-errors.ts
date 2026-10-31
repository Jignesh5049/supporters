import type { z } from 'zod';

/**
 * Plain-English messages for the shared schemas' generic Zod issues. Messages
 * the schemas set themselves ("Enter a valid GSTIN") take precedence.
 */
export const friendlyErrors: z.core.$ZodErrorMap = (issue) => {
  switch (issue.code) {
    case 'too_small':
      if (issue.origin === 'string') {
        return issue.input === '' || Number(issue.minimum) <= 1
          ? 'Required'
          : `Use at least ${issue.minimum} characters`;
      }
      if (issue.origin === 'array') return `Add at least ${issue.minimum}`;
      return `Must be at least ${issue.minimum}`;
    case 'too_big':
      if (issue.origin === 'string') return `Use at most ${issue.maximum} characters`;
      if (issue.origin === 'array') return `Add at most ${issue.maximum}`;
      return `Must be at most ${issue.maximum}`;
    case 'invalid_format':
      if (issue.format === 'url') return 'Enter a full link starting with https://';
      if (issue.format === 'uuid') return 'Choose an option';
      if (issue.format === 'email') return 'Enter a valid email address';
      return undefined;
    case 'invalid_value':
      return 'Choose an option';
    case 'invalid_type':
      if (issue.input === undefined || issue.input === '') return 'Required';
      return issue.expected === 'number' ? 'Enter a number' : undefined;
    default:
      return undefined;
  }
};

/** Parse options for `zodResolver(schema, FORM_PARSE_OPTIONS)`. */
export const FORM_PARSE_OPTIONS = { error: friendlyErrors } as const;

/** The first message in a react-hook-form error subtree (`price.amountPaise`, `tags.2`). */
export function firstError(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  if ('message' in error && typeof error.message === 'string' && error.message) {
    return error.message;
  }
  for (const [key, value] of Object.entries(error)) {
    // `ref` is the field's DOM element, not part of the error tree.
    if (key !== 'ref' && value && typeof value === 'object') {
      const nested = firstError(value);
      if (nested) return nested;
    }
  }
  return undefined;
}
