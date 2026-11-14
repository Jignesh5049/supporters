import { type NextRequest, NextResponse } from 'next/server';
import { resolveLegacyBusinessSlug } from '@/dal/legacy-business';
import { type RefreshOutcome, refreshSession } from '@/dal/refresh-session';
import {
  ADMIN_LOGIN_PATH,
  SESSION_COOKIE,
  adminLoginUrlFor,
  loginUrlFor,
  readJwtClaims,
} from '@/lib/auth/session-cookies';
import { type CspPolicy, buildCsp, generateNonce, readCspConfig } from '@/lib/security/csp';

/**
 * Signed-in-only routes. They move into an `(app)` route group later; until
 * then the prefixes are listed here. The redirect is a convenience only: the
 * DAL's `getSession()` and the API decide access.
 */
const SIGNED_IN_PREFIXES = [
  '/business/analytics',
  '/business/edit',
  '/business/enquiries',
  '/business/manage',
  '/business/posts',
  '/business/products',
  '/business/services',
  '/business/settings',
  '/business/verification',
  '/create',
  '/enquiries',
  '/messages',
  '/notifications',
  '/onboarding',
  '/profile',
  '/referral',
  '/requirements',
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

/** Extra headers the page render must see (the CSP nonce), merged over the request's own. */
export type RenderHeaders = Record<string, string>;

function withRenderHeaders(
  request: NextRequest,
  base: Headers | undefined,
  extra: RenderHeaders | undefined,
): Headers | undefined {
  if (!extra) return base;
  const headers = base ?? new Headers(request.headers);
  for (const [name, value] of Object.entries(extra)) headers.set(name, value);
  return headers;
}

export const isAdminRoute = (pathname: string) =>
  pathname === '/admin' || pathname.startsWith('/admin/');

/**
 * The admin area (web spec, Admin area). Admin sessions are a single 8-hour
 * access cookie with no refresh token, so the optimistic check is that cookie
 * being present and unexpired; the `(admin)` layout and the API decide access.
 * Every admin response, sign-in included, is `no-store` and `noindex`.
 */
export function withAdminSession(
  request: NextRequest,
  nowSec = Date.now() / 1000,
  renderHeaders?: RenderHeaders,
): NextResponse {
  const { pathname, search } = request.nextUrl;
  const access = request.cookies.get(SESSION_COOKIE.access)?.value;
  const claims = access ? readJwtClaims(access) : null;
  const isSignedIn = typeof claims?.exp === 'number' && claims.exp > nowSec;
  const isAdminToken = claims?.role === 'admin' && claims.mfa === true;
  let response: NextResponse;
  const headers = withRenderHeaders(request, undefined, renderHeaders);
  const next = () => (headers ? NextResponse.next({ request: { headers } }) : NextResponse.next());
  if (pathname === ADMIN_LOGIN_PATH) {
    response = next();
  } else if (!isSignedIn) {
    response = NextResponse.redirect(
      new URL(adminLoginUrlFor(`${pathname}${search}`), request.url),
    );
  } else if (!isAdminToken) {
    // Signed in, but not as an admin: a real 404 status. The layout's notFound()
    // streams inside Suspense, after a 200 is already sent.
    response = new NextResponse('Not found', { status: 404 });
  } else {
    response = next();
  }
  response.headers.set('cache-control', 'no-store');
  response.headers.set('x-robots-tag', 'noindex, nofollow');
  return response;
}

/**
 * Session step: refresh the access token when needed, then send signed-out
 * visitors of signed-in routes to login.
 */
export async function withSession(
  request: NextRequest,
  refresh: typeof refreshSession = refreshSession,
  renderHeaders?: RenderHeaders,
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

  const headers = withRenderHeaders(request, requestHeadersFor(request, outcome), renderHeaders);
  const response = headers ? NextResponse.next({ request: { headers } }) : NextResponse.next();
  applySetCookies(response, outcome);
  if (isSignedInRoute(pathname)) response.headers.set('cache-control', 'private, no-store');
  return response;
}

/** `/business/<uuid>`, the old id-based business URL. */
const LEGACY_BUSINESS_PATH =
  /^\/business\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/?$/i;

/**
 * Old id-based business URLs redirect permanently (308) to the slug URL. This
 * runs here, before the page streams, so crawlers get a real redirect status.
 */
export async function legacyBusinessRedirect(
  request: NextRequest,
  resolve: typeof resolveLegacyBusinessSlug = resolveLegacyBusinessSlug,
): Promise<NextResponse | null> {
  const match = LEGACY_BUSINESS_PATH.exec(request.nextUrl.pathname);
  if (!match?.[1]) return null;
  const slug = await resolve(match[1].toLowerCase());
  if (!slug) return null;
  const target = new URL(`/business/${slug}${request.nextUrl.search}`, request.url);
  return NextResponse.redirect(target, 308);
}

/** Sets the CSP and its reporting header on a response, whatever step produced it. */
export function applyCsp(response: NextResponse, policy: CspPolicy): NextResponse {
  response.headers.set(policy.headerName, policy.value);
  response.headers.set('reporting-endpoints', policy.reportingEndpoints);
  return response;
}

export async function proxy(request: NextRequest) {
  // A fresh nonce per request. Next reads it back out of the CSP *request* header and puts it
  // on every script and style it renders; `x-nonce` is for our own `next/script` uses.
  const nonce = generateNonce();
  const policy = buildCsp(readCspConfig(process.env, nonce));
  const renderHeaders: RenderHeaders = { 'x-nonce': nonce, [policy.headerName]: policy.value };

  const response = isAdminRoute(request.nextUrl.pathname)
    ? withAdminSession(request, undefined, renderHeaders)
    : ((await legacyBusinessRedirect(request)) ??
      (await withSession(request, undefined, renderHeaders)));
  return applyCsp(response, policy);
}

export const config = {
  matcher: [
    {
      // Pages only: not the API (`/v1`), the health check, the CSP report endpoint, Next internals or static files.
      source:
        '/((?!v1/|api/health|csp-report|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.[a-z0-9]+$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
