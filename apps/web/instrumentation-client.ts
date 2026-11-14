import * as Sentry from '@sentry/nextjs';
import { sentryOptions } from '@/lib/sentry';

// Browser side. NEXT_PUBLIC_SENTRY_DSN is baked in at build time (a Docker build arg); unset means
// Sentry is off. The CSP's connect-src must allow the DSN's ingest host (deploy/README.md).
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) Sentry.init(sentryOptions(dsn));

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
