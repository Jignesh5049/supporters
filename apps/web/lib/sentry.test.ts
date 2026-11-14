import type { ErrorEvent } from '@sentry/nextjs';
import { describe, expect, it } from 'vitest';
import { TRACES_SAMPLE_RATE, scrubEvent, sentryOptions } from './sentry';

const baseEvent: ErrorEvent = { type: undefined, event_id: 'abc' };

describe('scrubEvent', () => {
  it('keeps the path and an opaque user id, and hides everything personal', () => {
    const out = scrubEvent({
      ...baseEvent,
      request: {
        method: 'GET',
        url: 'https://example.test/reset-password?token=abc',
        headers: { cookie: '__Host-at=x', accept: 'text/html' },
      },
      user: { id: 'u1', email: 'a@b.in', ip_address: '1.2.3.4' },
      extra: { phone: '+919876543210', page: 'home' },
    });

    expect(out.request).toEqual({
      method: 'GET',
      url: 'https://example.test/reset-password',
      headers: { cookie: '[REDACTED]', accept: 'text/html' },
    });
    expect(out.user).toEqual({ id: 'u1' });
    expect(out.extra).toEqual({ phone: '[REDACTED]', page: 'home' });
  });
});

describe('sentryOptions', () => {
  it('samples 10% of traces and collects no user data', () => {
    const options = sentryOptions('https://key@example.ingest.sentry.test/1');
    expect(options.tracesSampleRate).toBe(TRACES_SAMPLE_RATE);
    expect(TRACES_SAMPLE_RATE).toBe(0.1);
    expect(options.dataCollection).toMatchObject({ userInfo: false, cookies: false });
  });
});
