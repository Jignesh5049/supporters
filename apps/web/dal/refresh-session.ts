import 'server-only';
import { CSRF_HEADER, SESSION_COOKIE, readJwtExpiry } from '@/lib/auth/session-cookies';
import { apiUrl, serverEnv } from './config';

/** Refresh when the access token is missing or expires within this many seconds. */
export const REFRESH_LEEWAY_SEC = 60;

export type RefreshOutcome =
  /** No refresh needed, or no refresh token to refresh with. */
  | { kind: 'skipped' }
  /** New cookies: forward `setCookies` to the browser and `cookies` to the render. */
  | { kind: 'refreshed'; setCookies: string[]; cookies: Map<string, string> }
  /** The API refused the refresh token. `setCookies` clears the stale cookies. */
  | { kind: 'rejected'; setCookies: string[] }
  /** The API was unreachable or failed. Leave the cookies alone and let the page decide. */
  | { kind: 'unavailable' };

interface CookieReader {
  get(name: string): { value: string } | undefined;
}

export function needsRefresh(cookies: CookieReader, nowSec = Date.now() / 1000): boolean {
  if (!cookies.get(SESSION_COOKIE.refresh)) return false;
  const access = cookies.get(SESSION_COOKIE.access)?.value;
  if (!access) return true;
  const exp = readJwtExpiry(access);
  return exp === null || exp - nowSec < REFRESH_LEEWAY_SEC;
}

/** `name=value` pairs from `Set-Cookie` headers. Cleared cookies come back with empty values. */
export function parseSetCookies(setCookies: string[]): Map<string, string> {
  const cookies = new Map<string, string>();
  for (const header of setCookies) {
    const pair = header.split(';', 1)[0] ?? '';
    const eq = pair.indexOf('=');
    if (eq > 0) cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
  return cookies;
}

/**
 * Server-to-server `POST /v1/auth/refresh`, forwarding only the session
 * cookies. The API treats it as a cookie write, so it needs the app `Origin`
 * and the CSRF header. Parallel refreshes from several tabs are safe because
 * of the API's 10-second grace window.
 */
export async function refreshSession(
  cookies: CookieReader,
  headers: Headers,
  fetchImpl: typeof fetch = fetch,
): Promise<RefreshOutcome> {
  if (!needsRefresh(cookies)) return { kind: 'skipped' };

  const refresh = cookies.get(SESSION_COOKIE.refresh)?.value ?? '';
  const csrf = cookies.get(SESSION_COOKIE.csrf)?.value;
  const cookieHeader = [
    `${SESSION_COOKIE.refresh}=${refresh}`,
    ...(csrf ? [`${SESSION_COOKIE.csrf}=${csrf}`] : []),
  ].join('; ');

  let response: Response;
  try {
    response = await fetchImpl(apiUrl('/v1/auth/refresh'), {
      method: 'POST',
      headers: {
        cookie: cookieHeader,
        origin: serverEnv.APP_ORIGIN,
        ...(csrf ? { [CSRF_HEADER]: csrf } : {}),
        ...(headers.get('user-agent') ? { 'user-agent': headers.get('user-agent') ?? '' } : {}),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(5_000),
    });
  } catch {
    return { kind: 'unavailable' };
  }

  const setCookies = response.headers.getSetCookie();
  if (response.ok) {
    return { kind: 'refreshed', setCookies, cookies: parseSetCookies(setCookies) };
  }
  if (response.status === 401 || response.status === 403) {
    return { kind: 'rejected', setCookies };
  }
  return { kind: 'unavailable' };
}
