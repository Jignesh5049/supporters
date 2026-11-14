import type { ErrorEvent } from '@sentry/nextjs';

/** Backend spec, Observability: errors and performance traces at a 10% sample rate. */
export const TRACES_SAMPLE_RATE = 0.1;

const REDACTED = '[REDACTED]';

/**
 * Credentials, tokens, OTPs, contact and payout details never leave the browser or the server. A
 * key-name pattern rather than a list, so a new field name errs on the side of hiding. The same
 * pattern guards the API's events (apps/api/src/lib/sentry.ts).
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

/** Removes request bodies, cookies, query strings and every sensitive key from an event. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  const scrubbed = { ...event };
  if (event.request) {
    const { method, url } = event.request;
    scrubbed.request = {
      ...(method === undefined ? {} : { method }),
      // The path only: query strings carry reset tokens and phone numbers.
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
    scrubbed.breadcrumbs = event.breadcrumbs.map((crumb) =>
      crumb.data ? { ...crumb, data: scrubValue(crumb.data) as Record<string, unknown> } : crumb,
    );
  }
  return scrubbed;
}

/**
 * Options shared by the browser and the server. No DSN means Sentry is off: callers skip init.
 * `dataCollection` keeps user info, cookies, headers, bodies and query strings out of every event.
 */
export function sentryOptions(dsn: string) {
  return {
    dsn,
    environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'production',
    ...(process.env.NEXT_PUBLIC_SENTRY_RELEASE
      ? { release: process.env.NEXT_PUBLIC_SENTRY_RELEASE }
      : {}),
    tracesSampleRate: TRACES_SAMPLE_RATE,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [] as never[],
      urlQueryParams: false,
    },
    beforeSend: scrubEvent,
  };
}
