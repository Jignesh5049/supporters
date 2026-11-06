import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import { needsRefresh, parseSetCookies, refreshSession } from '@/dal/refresh-session';
import { safeNextPath } from '@/lib/auth/session-cookies';
import { isSignedInRoute, withSession } from './proxy';

const NOW = Math.floor(Date.now() / 1000);

/** An unsigned JWT-shaped token; the proxy only reads `exp`. */
const accessToken = (exp: number) =>
  ['e30', Buffer.from(JSON.stringify({ sub: 'u1', exp })).toString('base64url'), 'sig'].join('.');

const request = (path: string, cookies: Record<string, string> = {}) =>
  new NextRequest(new URL(path, 'http://localhost:3000'), {
    headers: {
      cookie: Object.entries(cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join('; '),
      'user-agent': 'vitest',
    },
  });

const NEW_COOKIES = [
  `__Host-at=${accessToken(NOW + 900)}; Max-Age=900; Path=/; HttpOnly; Secure; SameSite=Lax`,
  '__Host-rt=rt-2; Max-Age=2592000; Path=/; HttpOnly; Secure; SameSite=Lax',
  '__Host-csrf=csrf-1; Max-Age=2592000; Path=/; Secure; SameSite=Lax',
];

function apiReturning(response: () => Response) {
  return vi.fn<typeof fetch>(() => Promise.resolve(response()));
}

const refreshed = () => {
  const headers = new Headers();
  for (const cookie of NEW_COOKIES) headers.append('set-cookie', cookie);
  return new Response(null, { status: 204, headers });
};

/** The proxy step with the refresh call going to a fake API. */
const runProxy = (req: NextRequest, api: typeof fetch) =>
  withSession(req, (cookies, headers) => refreshSession(cookies, headers, api));

describe('needsRefresh', () => {
  const jar = (cookies: Record<string, string>) => ({
    get: (name: string) => (name in cookies ? { value: cookies[name]! } : undefined),
  });

  it('refreshes when the access token is missing or expires within 60 s', () => {
    expect(needsRefresh(jar({ '__Host-rt': 'rt' }), NOW)).toBe(true);
    expect(needsRefresh(jar({ '__Host-rt': 'rt', '__Host-at': accessToken(NOW + 59) }), NOW)).toBe(
      true,
    );
    expect(needsRefresh(jar({ '__Host-rt': 'rt', '__Host-at': 'not-a-jwt' }), NOW)).toBe(true);
  });

  it('skips a fresh access token, or when there is no refresh token', () => {
    expect(needsRefresh(jar({ '__Host-rt': 'rt', '__Host-at': accessToken(NOW + 600) }), NOW)).toBe(
      false,
    );
    expect(needsRefresh(jar({ '__Host-at': accessToken(NOW - 10) }), NOW)).toBe(false);
  });
});

describe('optimistic redirect', () => {
  it('sends a signed-out visitor of a signed-in route to login with a relative next', async () => {
    const api = apiReturning(refreshed);
    const response = await runProxy(request('/messages/42?tab=unread'), api);
    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('next')).toBe('/messages/42?tab=unread');
    expect(api).not.toHaveBeenCalled();
  });

  it('lets signed-out visitors through public routes', async () => {
    const response = await runProxy(request('/discover'), apiReturning(refreshed));
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('lets a visitor with a refresh token through a signed-in route', async () => {
    const response = await runProxy(
      request('/settings', { '__Host-rt': 'rt-1', '__Host-at': accessToken(NOW + 600) }),
      apiReturning(refreshed),
    );
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('private, no-store');
  });

  it('matches route prefixes on segment boundaries only', () => {
    expect(isSignedInRoute('/settings')).toBe(true);
    expect(isSignedInRoute('/business/manage/team')).toBe(true);
    expect(isSignedInRoute('/business/sharma-textiles')).toBe(false);
    expect(isSignedInRoute('/settingsx')).toBe(false);
  });

  it.each([
    ['/messages', '/messages'],
    ['//evil.example', '/'],
    ['/\\evil.example', '/'],
    ['https://evil.example', '/'],
    ['/a\tb', '/'],
    [null, '/'],
  ])('safeNextPath(%j) is %j', (value, expected) => {
    expect(safeNextPath(value)).toBe(expected);
  });
});

describe('token refresh', () => {
  it('refreshes an expiring session and copies Set-Cookie to the response and the request', async () => {
    const api = apiReturning(refreshed);
    const response = await runProxy(
      request('/settings', {
        '__Host-rt': 'rt-1',
        '__Host-at': accessToken(NOW + 30),
        '__Host-csrf': 'csrf-1',
        theme: 'light',
      }),
      api,
    );

    // Server-to-server call that passes the API's Origin + CSRF check.
    const [url, init] = api.mock.calls[0]!;
    expect(url).toBe('http://127.0.0.1:3001/v1/auth/refresh');
    const sent = new Headers(init?.headers);
    expect(init?.method).toBe('POST');
    expect(sent.get('origin')).toBe('http://localhost:3000');
    expect(sent.get('x-csrf-token')).toBe('csrf-1');
    expect(sent.get('cookie')).toBe('__Host-rt=rt-1; __Host-csrf=csrf-1');

    // Browser gets the API's cookies unchanged.
    expect(response.headers.getSetCookie()).toEqual(NEW_COOKIES);

    // The page renders with the new tokens (Next passes overridden request headers this way).
    expect(response.headers.get('x-middleware-override-headers')).toContain('cookie');
    const renderCookies = response.headers.get('x-middleware-request-cookie') ?? '';
    expect(renderCookies).toContain(`__Host-at=${accessToken(NOW + 900)}`);
    expect(renderCookies).toContain('__Host-rt=rt-2');
    expect(renderCookies).toContain('theme=light');
  });

  it('redirects to login and clears cookies when the API rejects the refresh token', async () => {
    const cleared = ['__Host-at=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax'];
    const api = apiReturning(() => {
      const headers = new Headers({ 'content-type': 'application/problem+json' });
      for (const cookie of cleared) headers.append('set-cookie', cookie);
      return new Response('{"code":"INVALID_REFRESH_TOKEN"}', { status: 401, headers });
    });
    const response = await runProxy(request('/wallet', { '__Host-rt': 'stolen' }), api);
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location')!).searchParams.get('next')).toBe('/wallet');
    expect(response.headers.getSetCookie()).toEqual(cleared);
  });

  it('clears cookies itself when the API refuses before its handler (CSRF)', async () => {
    const api = apiReturning(() => new Response('{"code":"CSRF_FAILED"}', { status: 403 }));
    const response = await runProxy(request('/', { '__Host-rt': 'rt-1' }), api);
    expect(response.headers.get('location')).toBeNull();
    const setCookies = response.headers.getSetCookie();
    expect(setCookies).toHaveLength(3);
    for (const cookie of setCookies) expect(cookie).toMatch(/^__Host-\w+=; Path=\/; .*Max-Age=0/);
  });

  it('keeps the session when the API is unreachable', async () => {
    const api = vi.fn<typeof fetch>(() => Promise.reject(new TypeError('fetch failed')));
    const response = await runProxy(request('/settings', { '__Host-rt': 'rt-1' }), api);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.getSetCookie()).toEqual([]);
  });

  it('parses name=value pairs from Set-Cookie headers', () => {
    expect(parseSetCookies(['a=1; Path=/', 'b=; Max-Age=0', 'junk'])).toEqual(
      new Map([
        ['a', '1'],
        ['b', ''],
      ]),
    );
  });

  it('attaches strict Content Security Policy with nonce and security headers', async () => {
    const api = apiReturning(() => refreshed());
    const response = await runProxy(request('/'), api);

    const csp = response.headers.get('content-security-policy');
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("'nonce-");
    expect(csp).toContain("'strict-dynamic'");
    expect(csp).toContain('https://checkout.razorpay.com');
    expect(csp).toContain('https://media.supporters.in');
    expect(csp).toContain("frame-ancestors 'none'");

    expect(response.headers.get('strict-transport-security')).toBe(
      'max-age=63072000; includeSubDomains; preload',
    );
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(response.headers.get('cross-origin-opener-policy')).toBe('same-origin-allow-popups');
    expect(response.headers.get('permissions-policy')).toContain(
      'payment=(self "https://checkout.razorpay.com")',
    );
    expect(response.headers.get('reporting-endpoints')).toContain('csp-endpoint=');
  });
});
