import { type NextRequest, NextResponse } from 'next/server';
import { resolveLegacyBusinessSlug } from '@/dal/legacy-business';
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
  '/business/premium',
  '/business/products',
  '/business/services',
  '/business/settings',
  '/business/verification',
  '/create',
  '/messages',
  '/notifications',
  '/onboarding',
  '/profile',
  '/referral',
  '/requirements/new',
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

export function generateNonce(): string {
  return Buffer.from(crypto.randomUUID()).toString('base64');
}

/**
 * Generates strict Content Security Policy directives complying with
 * OWASP ASVS 5.0 L2 and web spec line 125.
 */
export function buildContentSecurityPolicy(
  nonce: string,
  isDev: boolean = process.env.NODE_ENV === 'development',
): string {
  const isProd = !isDev;
  const scriptSrc = [
    "'self'",
    `'nonce-${nonce}'`,
    "'strict-dynamic'",
    'https://checkout.razorpay.com',
    isDev ? "'unsafe-eval'" : '',
  ]
    .filter(Boolean)
    .join(' ');

  const styleSrc = ["'self'", `'nonce-${nonce}'`, isDev ? "'unsafe-inline'" : '']
    .filter(Boolean)
    .join(' ');

  const imgSrc = [
    "'self'",
    'blob:',
    'data:',
    'https://media.supporters.in',
    'https://images.unsplash.com',
    isDev ? 'http://127.0.0.1:* http://localhost:*' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const mediaSrc = [
    "'self'",
    'blob:',
    'https://media.supporters.in',
    isDev ? 'http://127.0.0.1:* http://localhost:*' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const connectSrc = [
    "'self'",
    'wss://*.supporters.in',
    'wss://supporters.in',
    'https://media.supporters.in',
    'https://*.ingest.sentry.io',
    'https://api.razorpay.com',
    'https://lumberjack.razorpay.com',
    isDev
      ? 'ws://localhost:* ws://127.0.0.1:* http://localhost:* http://127.0.0.1:* http://127.0.0.1:9000 http://127.0.0.1:3001'
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  const directives = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    `style-src ${styleSrc}`,
    `img-src ${imgSrc}`,
    `media-src ${mediaSrc}`,
    `connect-src ${connectSrc}`,
    'frame-src https://api.razorpay.com https://checkout.razorpay.com',
    "worker-src 'self'",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    isProd ? 'upgrade-insecure-requests' : '',
    'report-to csp-endpoint',
  ].filter(Boolean);

  return directives.join('; ');
}

export function applySecurityHeaders(
  response: NextResponse,
  nonce: string,
  isDev: boolean = process.env.NODE_ENV === 'development',
) {
  const csp = buildContentSecurityPolicy(nonce, isDev);
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set(
    'Reporting-Endpoints',
    'csp-endpoint="https://sentry.supporters.in/api/security/csp"',
  );
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload',
  );
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(self "https://checkout.razorpay.com")',
  );
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
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

/** The cookie header the page renders with: the new tokens, or none after a rejection, plus x-nonce. */
function requestHeadersFor(
  request: NextRequest,
  outcome: RefreshOutcome,
  nonce: string,
): Headers {
  const cookies = new Map(request.cookies.getAll().map(({ name, value }) => [name, value]));
  if (outcome.kind === 'refreshed') {
    for (const [name, value] of outcome.cookies) {
      if (value) cookies.set(name, value);
      else cookies.delete(name);
    }
  } else if (outcome.kind === 'rejected') {
    for (const name of Object.values(SESSION_COOKIE)) cookies.delete(name);
  }
  const headers = new Headers(request.headers);
  if (outcome.kind === 'refreshed' || outcome.kind === 'rejected') {
    headers.set('cookie', [...cookies].map(([name, value]) => `${name}=${value}`).join('; '));
  }
  headers.set('x-nonce', nonce);
  return headers;
}

/**
 * Session step: refresh the access token when needed, then send signed-out
 * visitors of signed-in routes to login. Applies CSP nonce and security headers.
 */
export async function withSession(
  request: NextRequest,
  refresh: typeof refreshSession = refreshSession,
  nonce: string = generateNonce(),
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
    applySecurityHeaders(response, nonce);
    return response;
  }

  const headers = requestHeadersFor(request, outcome, nonce);
  const response = NextResponse.next({ request: { headers } });
  applySetCookies(response, outcome);
  applySecurityHeaders(response, nonce);
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

export async function proxy(request: NextRequest) {
  const nonce = generateNonce();
  const redirect = await legacyBusinessRedirect(request);
  if (redirect) {
    applySecurityHeaders(redirect, nonce);
    return redirect;
  }
  return withSession(request, refreshSession, nonce);
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
