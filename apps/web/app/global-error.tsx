'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-background px-4 font-sans text-foreground">
        <main className="max-w-md space-y-4 text-center" role="alert" aria-live="assertive">
          <h1 className="text-2xl font-bold">Critical Application Error</h1>
          <p className="text-sm text-muted-foreground">
            A critical error occurred while rendering the page.
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
          )}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow-xs transition-colors hover:bg-primary/90"
            >
              Try Again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
