/**
 * Cookie names set by the API on `/v1/auth/*` (backend spec, Security: Web cookies).
 * `at` and `rt` are HttpOnly; only `csrf` is readable by scripts.
 */
export const SESSION_COOKIE = {
  access: '__Host-at',
  refresh: '__Host-rt',
  csrf: '__Host-csrf',
} as const;

export const CSRF_HEADER = 'x-csrf-token';

/** Where signed-out visitors go when a signed-in route needs a session. */
export const LOGIN_PATH = '/login';

/**
 * Accepts only same-origin relative paths for `?next=` redirects: a single
 * leading `/`, never `//` or `/\` (both are protocol-relative in browsers).
 */
export function safeNextPath(value: string | null | undefined, fallback = '/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return fallback;
  }
  // Control characters (including tab and newline) can smuggle a host through URL parsing.
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;
  return value;
}

export function loginUrlFor(nextPath: string): string {
  return `${LOGIN_PATH}?next=${encodeURIComponent(safeNextPath(nextPath))}`;
}

/**
 * Reads `exp` (seconds) from a JWT without verifying it. Only for timing the
 * refresh; the API verifies every token.
 */
export function readJwtExpiry(token: string): number | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const json: unknown = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof json === 'object' && json !== null && 'exp' in json) {
      return typeof json.exp === 'number' ? json.exp : null;
    }
    return null;
  } catch {
    return null;
  }
}
