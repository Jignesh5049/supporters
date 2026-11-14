import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@/lib/sentry';

// Server side. SENTRY_DSN is read at container start (SSM); unset means Sentry is off.
export function register() {
  const dsn = process.env.SENTRY_DSN;
  if (dsn && process.env.NEXT_RUNTIME === 'nodejs') Sentry.init(sentryOptions(dsn));
}

export const onRequestError = Sentry.captureRequestError;
