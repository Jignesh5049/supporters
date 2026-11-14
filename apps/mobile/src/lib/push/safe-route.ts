/**
 * A push notification's `data.url` comes from outside the app (the API's payload, and in time
 * anything a push provider relays), so it is checked before it reaches the router. Only an
 * in-app path under a known section passes: no scheme (`https:`, `supporters:`, `javascript:`),
 * no `//host`, no `..`, no backslashes. Anything else falls back to the notification list.
 */
const SECTIONS = new Set([
  'business',
  'hub',
  'messages',
  'notifications',
  'post',
  'product',
  'referral',
  'requirements',
  'saved',
  'search',
  'service',
  'settings',
  'wallet',
]);

const SAFE_PATH = /^\/[\w\-.~%/]*(\?[\w\-.~%=&,+]*)?$/;

export function safeInternalPath(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 300) return null;
  if (!SAFE_PATH.test(raw)) return null;
  const path = raw.split('?')[0] ?? '';
  const segments = path.split('/').filter(Boolean);
  if (segments.some((segment) => segment === '.' || segment === '..')) return null;
  if (segments.some((segment) => /%2e|%2f|%5c/i.test(segment))) return null;
  const [section] = segments;
  return section && SECTIONS.has(section) ? raw : null;
}

/** An id from a payload, safe to put in a path segment. */
export const pathSegment = (value: string): string => encodeURIComponent(value);
