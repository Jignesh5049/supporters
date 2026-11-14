import * as Sentry from '@sentry/node';
import type { Breadcrumb, ErrorEvent } from '@sentry/node';

/** Backend spec, Observability: errors and performance traces at a 10% sample rate. */
export const TRACES_SAMPLE_RATE = 0.1;

const REDACTED = '[REDACTED]';

/**
 * Backend spec, Data protection: credentials, tokens, OTPs, contact and payout details never leave
 * the process. A key-name pattern rather than a list, so a new field name errs on the side of
 * hiding (it is a superset of REDACT_PATHS in app.ts, which pino uses for the logs).
 */
const SENSITIVE_KEY =
  /pass(word)?|token|secret|otp|auth|cookie|csrf|session|phone|mobile|email|identifier|account|ifsc|upi|vpa|vapid|private|signature|jwt|key/i;

function scrubValue(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => scrubValue(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? REDACTED : scrubValue(item, depth + 1),
    ]),
  );
}

function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb {
  return crumb.data ? { ...crumb, data: scrubValue(crumb.data) as Record<string, unknown> } : crumb;
}

/** Removes request bodies, cookies, query strings and every sensitive key from an event. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const scrubbed = { ...event };
  if (event.request) {
    const { method, url } = event.request;
    scrubbed.request = {
      ...(method === undefined ? {} : { method }),
      // The path only: query strings carry tokens and phone numbers.
      ...(url === undefined ? {} : { url: url.split('?')[0] }),
      headers: scrubValue(event.request.headers) as Record<string, string>,
    };
  }
  // Only the opaque user id is kept; never an email, phone number or IP address.
  if (event.user?.id !== undefined) scrubbed.user = { id: event.user.id };
  else delete scrubbed.user;
  if (event.extra) scrubbed.extra = scrubValue(event.extra) as Record<string, unknown>;
  if (event.contexts) scrubbed.contexts = scrubValue(event.contexts) as typeof event.contexts;
  if (event.breadcrumbs) {
    scrubbed.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb);
  }
  return scrubbed;
}

interface SentryEnv {
  SENTRY_DSN?: string | undefined;
  SENTRY_RELEASE?: string | undefined;
  NODE_ENV?: string | undefined;
}

/** Starts Sentry when a DSN is set; with no DSN it does nothing at all. */
export function initSentry(env: SentryEnv, service: 'api' | 'worker'): boolean {
  if (!env.SENTRY_DSN) return false;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV ?? 'development',
    ...(env.SENTRY_RELEASE ? { release: env.SENTRY_RELEASE } : {}),
    initialScope: { tags: { service } },
    // Sentry 11: collect no user info, cookies, headers, bodies or query strings on any event or
    // span. scrubEvent below is the second line of defence for what slips through (extra, contexts).
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
    },
    tracesSampleRate: TRACES_SAMPLE_RATE,
    beforeSend: (event) => scrubEvent(event),
    beforeBreadcrumb: scrubBreadcrumb,
  });
  return true;
}
