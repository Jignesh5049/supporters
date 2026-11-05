import * as Sentry from '@sentry/react-native';

/**
 * Scrubs sensitive PII (tokens, phone numbers, payout/bank info)
 * per mobile spec line 155 before sending crash events to Sentry.
 */
function scrubPii(event: Sentry.ErrorEvent): Sentry.ErrorEvent {
  if (event.request?.headers) {
    if (event.request.headers['Authorization']) {
      event.request.headers['Authorization'] = '[REDACTED]';
    }
  }

  // Scrub phone numbers and bank account numbers from event messages
  if (event.message) {
    event.message = event.message
      .replace(/\+91\d{10}/g, '+91[REDACTED]')
      .replace(/\b\d{10}\b/g, '[PHONE_REDACTED]')
      .replace(/\b\d{9,18}\b/g, '[ACCOUNT_REDACTED]');
  }

  return event;
}

/**
 * Initializes Sentry crash reporting in release builds.
 */
export function initSentry() {
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    debug: __DEV__,
    beforeSend: scrubPii,
    tracesSampleRate: 0.2,
    enableAutoSessionTracking: true,
  });
}
