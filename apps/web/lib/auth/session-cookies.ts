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

/** The separate admin sign-in (password plus TOTP). */
export const ADMIN_LOGIN_PATH = '/admin/login';

/** Admin sign-in returning to `nextPath`, which must itself be an admin page. */
export function adminLoginUrlFor(nextPath: string): string {
  const next = safeNextPath(nextPath, '/admin');
  const isAdminPage = next === '/admin' || next.startsWith('/admin/') || next.startsWith('/admin?');
  return `${ADMIN_LOGIN_PATH}?next=${encodeURIComponent(isAdminPage ? next : '/admin')}`;
}

/**
 * Reads `exp` (seconds) from a JWT without verifying it. Only for timing the
 * refresh; the API verifies every token.
 */
export function readJwtExpiry(token: string): number | null {
  const exp = readJwtClaims(token)?.exp;
  return typeof exp === 'number' ? exp : null;
}

/**
 * The payload of a JWT, unverified. Only for decisions that can deny, never
 * grant: a forged claim still meets the layout check and the API's own guard.
 */
export function readJwtClaims(token: string): Record<string, unknown> | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const json: unknown = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json === 'object' && json !== null ? (json as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
