import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './client';
import { ApiError, errorMessage } from './errors';

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

const problem = (status: number, code: string, extra: Record<string, unknown> = {}) =>
  json(status, { type: 'about:blank', title: 'Problem', status, code, ...extra });

function setup(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(handler(String(input), init ?? {})),
  );
  const cookies: Record<string, string> = { '__Host-csrf': 'csrf-1' };
  const onSessionExpired = vi.fn();
  const client = createApiClient({
    fetch: fetchMock as unknown as typeof fetch,
    readCookie: (name) => cookies[name],
    onSessionExpired,
  });
  const callsTo = (path: string) => fetchMock.mock.calls.filter(([url]) => String(url) === path);
  return { client, fetchMock, cookies, onSessionExpired, callsTo };
}

const headerOf = (init: RequestInit | undefined, name: string) =>
  (init?.headers as Record<string, string> | undefined)?.[name];

describe('CSRF header', () => {
  it('sends the __Host-csrf cookie as x-csrf-token on writes', async () => {
    const { client, fetchMock } = setup(() => new Response(null, { status: 204 }));
    await client.request('/v1/things', { method: 'POST', body: { a: 1 } });
    const [, init] = fetchMock.mock.calls[0]!;
    expect(headerOf(init, 'x-csrf-token')).toBe('csrf-1');
    expect(headerOf(init, 'content-type')).toBe('application/json');
    expect(init?.credentials).toBe('same-origin');
    expect(init?.body).toBe('{"a":1}');
  });

  it('does not send it on reads', async () => {
    const { client, fetchMock } = setup(() => json(200, { ok: true }));
    await expect(client.request('/v1/things')).resolves.toEqual({ ok: true });
    expect(headerOf(fetchMock.mock.calls[0]![1], 'x-csrf-token')).toBeUndefined();
  });
});

describe('refresh on 401', () => {
  it('refreshes once for concurrent 401s, then retries each request once', async () => {
    let isRefreshed = false;
    const { client, callsTo, onSessionExpired } = setup((url) => {
      if (url === '/v1/auth/refresh') {
        isRefreshed = true;
        return new Response(null, { status: 204 });
      }
      return isRefreshed ? json(200, { url }) : problem(401, 'UNAUTHENTICATED');
    });

    const results = await Promise.all([
      client.request('/v1/a'),
      client.request('/v1/b', { method: 'POST' }),
      client.request('/v1/c'),
    ]);

    expect(results).toEqual([{ url: '/v1/a' }, { url: '/v1/b' }, { url: '/v1/c' }]);
    expect(callsTo('/v1/auth/refresh')).toHaveLength(1);
    expect(callsTo('/v1/a')).toHaveLength(2);
    expect(callsTo('/v1/b')).toHaveLength(2);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('sends the CSRF header on the refresh call', async () => {
    const { client, callsTo } = setup((url) =>
      url === '/v1/auth/refresh'
        ? new Response(null, { status: 204 })
        : problem(401, 'UNAUTHENTICATED'),
    );
    await client.request('/v1/a').catch(() => undefined);
    expect(headerOf(callsTo('/v1/auth/refresh')[0]![1], 'x-csrf-token')).toBe('csrf-1');
  });

  it('retries only once when the retry is also refused', async () => {
    const { client, callsTo } = setup((url) =>
      url === '/v1/auth/refresh'
        ? new Response(null, { status: 204 })
        : problem(401, 'UNAUTHENTICATED'),
    );
    await expect(client.request('/v1/a')).rejects.toMatchObject({ status: 401 });
    expect(callsTo('/v1/a')).toHaveLength(2);
    expect(callsTo('/v1/auth/refresh')).toHaveLength(1);
  });

  it('sends the user to login when the refresh fails', async () => {
    const { client, callsTo, onSessionExpired } = setup((url) =>
      url === '/v1/auth/refresh'
        ? problem(401, 'INVALID_REFRESH_TOKEN')
        : problem(401, 'UNAUTHENTICATED'),
    );
    await expect(client.request('/v1/a')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(callsTo('/v1/a')).toHaveLength(1);
    expect(onSessionExpired).toHaveBeenCalledOnce();
  });

  it('starts a new refresh after the previous one settled', async () => {
    let isValid = false;
    const { client, callsTo } = setup((url) => {
      if (url === '/v1/auth/refresh') {
        isValid = true;
        return new Response(null, { status: 204 });
      }
      if (isValid) {
        isValid = false; // the next call finds the token expired again
        return json(200, {});
      }
      return problem(401, 'UNAUTHENTICATED');
    });
    await client.request('/v1/a');
    await client.request('/v1/b');
    expect(callsTo('/v1/auth/refresh')).toHaveLength(2);
  });

  it('never refreshes for auth calls, where 401 means wrong credentials', async () => {
    const { client, callsTo, onSessionExpired } = setup(() => problem(401, 'INVALID_CREDENTIALS'));
    await expect(
      client.request('/v1/auth/login', { method: 'POST', body: {} }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(callsTo('/v1/auth/refresh')).toHaveLength(0);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });
});

describe('error mapping', () => {
  it('maps an RFC 9457 problem to ApiError by code', async () => {
    const { client } = setup(() =>
      problem(400, 'VALIDATION_FAILED', {
        errors: [{ path: 'body.phone', message: 'Enter a +91 mobile number' }],
      }),
    );
    const error = await client.request('/v1/x', { method: 'POST' }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
      fieldErrors: [{ path: 'body.phone', message: 'Enter a +91 mobile number' }],
    });
    expect(errorMessage(error)).toMatch(/highlighted fields/);
  });

  it('reads Retry-After for rate limits', async () => {
    const { client } = setup(() =>
      json(429, { code: 'RATE_LIMITED', title: 'Too many requests' }, { 'retry-after': '900' }),
    );
    const error = await client.request('/v1/x').catch((e: unknown) => e);
    expect(error).toMatchObject({ code: 'RATE_LIMITED', retryAfter: 900 });
    expect(errorMessage(error)).toBe('Too many attempts. Try again in 15 min.');
  });

  it('maps known codes to user-facing copy', () => {
    const error = (code: string) => new ApiError({ status: 400, code, title: 'x' });
    expect(errorMessage(error('OTP_INVALID'))).toBe('That code is wrong or has expired.');
    expect(errorMessage(error('PHONE_TAKEN'))).toMatch(/already has an account/);
    expect(errorMessage(error('SOMETHING_NEW'))).toBe('Something went wrong. Try again.');
    expect(errorMessage(new Error('boom'))).toBe('Something went wrong. Try again.');
  });

  it('falls back to UNKNOWN for a non-JSON error body', async () => {
    const { client } = setup(() => new Response('<html>Bad gateway</html>', { status: 502 }));
    await expect(client.request('/v1/x')).rejects.toMatchObject({ status: 502, code: 'UNKNOWN' });
  });

  it('reports a network failure as NETWORK_ERROR', async () => {
    const { client } = setup(() => {
      throw new TypeError('fetch failed');
    });
    await expect(client.request('/v1/x')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });
});
