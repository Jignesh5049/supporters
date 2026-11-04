import 'server-only';
import { cookies, headers } from 'next/headers';
import type { z } from 'zod';
import { SESSION_COOKIE } from '@/lib/auth/session-cookies';
import { apiUrl } from './config';

interface ApiGetOptions {
  /**
   * `true`: send the access cookie (owner endpoints); null when signed out.
   * `'optional'`: send it when there is one, so public reads carry the
   * viewer's own state (`isLiked`, the personal feed); a stale token falls
   * back to the guest read. Default: no cookies.
   */
  withSession?: boolean | 'optional';
}

/**
 * `GET` from the API on the server, validated with a shared Zod schema.
 * Returns null on 404 (and 401 for session reads); throws on anything else,
 * so an outage shows the error page instead of looking like missing data.
 */
export async function apiGet<T extends z.ZodType>(
  path: `/v1/${string}`,
  schema: T,
  { withSession = false }: ApiGetOptions = {},
): Promise<z.infer<T> | null> {
  const requestId = (await headers()).get('x-request-id');
  const requestHeaders: Record<string, string> = { accept: 'application/json' };
  if (requestId) requestHeaders['x-request-id'] = requestId;
  const access = withSession ? (await cookies()).get(SESSION_COOKIE.access)?.value : undefined;
  if (withSession === true && !access) return null;

  const send = (cookie?: string) =>
    fetch(apiUrl(path), {
      headers: cookie ? { ...requestHeaders, cookie } : requestHeaders,
      cache: 'no-store',
    });
  let response = await send(access && `${SESSION_COOKIE.access}=${access}`);
  if (response.status === 401 && withSession === 'optional') response = await send();

  if (response.status === 404 || (withSession === true && response.status === 401)) return null;
  if (!response.ok) throw new Error(`GET ${path} failed with ${response.status}`);
  return schema.parse(await response.json());
}
