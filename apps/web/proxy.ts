import { type NextRequest, NextResponse } from 'next/server';
import { type RefreshOutcome, refreshSession } from '@/dal/refresh-session';
import { SESSION_COOKIE, loginUrlFor } from '@/lib/auth/session-cookies';

/**
 * Signed-in-only routes. They move into an `(app)` route group later; until
 * then the prefixes are listed here. The redirect is a convenience only: the
 * DAL's `getSession()` and the API decide access.
 */
const SIGNED_IN_PREFIXES = [
  '/admin',
  '/business/analytics',
  '/business/edit',
  '/business/enquiries',
  '/business/manage',
  '/business/posts',
  '/business/products',
  '/business/services',
  '/business/settings',
  '/create',
  '/messages',
  '/notifications',
  '/onboarding',
  '/profile',
  '/referral',
  '/saved',
  '/settings',
  '/subscription',
  '/wallet',
];

export function isSignedInRoute(pathname: string): boolean {
  return SIGNED_IN_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

const CLEARED_COOKIE = { path: '/', secure: true, sameSite: 'lax', maxAge: 0 } as const;

/** Sends a refreshed or cleared session to the browser. */
function applySetCookies(response: NextResponse, outcome: RefreshOutcome) {
  if (outcome.kind !== 'refreshed' && outcome.kind !== 'rejected') return;
  for (const header of outcome.setCookies) response.headers.append('set-cookie', header);
  if (outcome.kind === 'rejected' && outcome.setCookies.length === 0) {
    // The API refused before reaching its handler (CSRF), so clear the stale cookies here
    // to stop every later request from retrying the same refresh.
    for (const name of Object.values(SESSION_COOKIE)) {
      response.cookies.set(name, '', { ...CLEARED_COOKIE, httpOnly: name !== SESSION_COOKIE.csrf });
    }
  }
}

/** The cookie header the page renders with: the new tokens, or none after a rejection. */
function requestHeadersFor(request: NextRequest, outcome: RefreshOutcome): Headers | undefined {
  if (outcome.kind !== 'refreshed' && outcome.kind !== 'rejected') return undefined;
  const cookies = new Map(request.cookies.getAll().map(({ name, value }) => [name, value]));
  if (outcome.kind === 'refreshed') {
    for (const [name, value] of outcome.cookies) {
      if (value) cookies.set(name, value);
      else cookies.delete(name);
    }
  } else {
    for (const name of Object.values(SESSION_COOKIE)) cookies.delete(name);
  }
  const headers = new Headers(request.headers);
  headers.set('cookie', [...cookies].map(([name, value]) => `${name}=${value}`).join('; '));
  return headers;
}

/**
 * Session step: refresh the access token when needed, then send signed-out
 * visitors of signed-in routes to login. Returns the response for the next
 * step (the CSP nonce and security headers are added in a follow-up).
 */
export async function withSession(
  request: NextRequest,
  refresh: typeof refreshSession = refreshSession,
): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;
  const outcome = await refresh(request.cookies, request.headers);

  const hasSession =
    outcome.kind === 'refreshed' ||
    (outcome.kind !== 'rejected' && request.cookies.has(SESSION_COOKIE.refresh));

  if (!hasSession && isSignedInRoute(pathname)) {
    const response = NextResponse.redirect(
      new URL(loginUrlFor(`${pathname}${search}`), request.url),
    );
    applySetCookies(response, outcome);
    return response;
  }

  const headers = requestHeadersFor(request, outcome);
  const response = headers ? NextResponse.next({ request: { headers } }) : NextResponse.next();
  applySetCookies(response, outcome);
  if (isSignedInRoute(pathname)) response.headers.set('cache-control', 'private, no-store');
  return response;
}

export function proxy(request: NextRequest) {
  return withSession(request);
}

export const config = {
  matcher: [
    {
      // Pages only: not the API (`/v1`), Next internals or static files.
      source:
        '/((?!v1/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.[a-z0-9]+$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
