import type { ErrorEvent } from '@sentry/node';
import { describe, expect, it } from 'vitest';
import { TRACES_SAMPLE_RATE, initSentry, scrubEvent } from './sentry';

const baseEvent: ErrorEvent = { type: undefined, event_id: 'abc' };

describe('scrubEvent', () => {
  it('drops cookies, tokens, query strings and personal details', () => {
    const event: ErrorEvent = {
      ...baseEvent,
      request: {
        method: 'POST',
        url: 'https://example.test/v1/auth/login?otp=123456&phone=%2B919876543210',
        headers: { authorization: 'Bearer abc', cookie: '__Host-at=x', 'user-agent': 'curl' },
        data: { password: 'hunter2' },
      },
      user: { id: 'u1', email: 'a@b.in', ip_address: '1.2.3.4' },
      extra: { phone: '+919876543210', note: 'ok', nested: { refreshToken: 'r', fine: 1 } },
      breadcrumbs: [{ message: 'x', data: { otp: '123456', url: '/v1/me' } }],
    };

    const out = scrubEvent(event);

    expect(out.request).toEqual({
      method: 'POST',
      url: 'https://example.test/v1/auth/login',
      headers: { authorization: '[REDACTED]', cookie: '[REDACTED]', 'user-agent': 'curl' },
    });
    expect(out.user).toEqual({ id: 'u1' });
    expect(out.extra).toEqual({
      phone: '[REDACTED]',
      note: 'ok',
      nested: { refreshToken: '[REDACTED]', fine: 1 },
    });
    expect(out.breadcrumbs?.[0]?.data).toEqual({ otp: '[REDACTED]', url: '/v1/me' });
  });

  it('removes a user that has no id', () => {
    const out = scrubEvent({ ...baseEvent, user: { email: 'a@b.in' } });
    expect(out.user).toBeUndefined();
  });
});

describe('initSentry', () => {
  it('does nothing without a DSN', () => {
    expect(initSentry({ NODE_ENV: 'production' }, 'api')).toBe(false);
  });

  it('samples 10% of traces', () => {
    expect(TRACES_SAMPLE_RATE).toBe(0.1);
  });
});
