import 'server-only';
import { cookies, headers } from 'next/headers';
import type { z } from 'zod';
import { SESSION_COOKIE } from '@/lib/auth/session-cookies';
import { apiUrl } from './config';

interface ApiGetOptions {
  /** Send the access cookie (owner endpoints). Public reads send no cookies. */
  withSession?: boolean;
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
  if (withSession) {
    const access = (await cookies()).get(SESSION_COOKIE.access)?.value;
    if (!access) return null;
    requestHeaders.cookie = `${SESSION_COOKIE.access}=${access}`;
  }

  const response = await fetch(apiUrl(path), { headers: requestHeaders, cache: 'no-store' });
  if (response.status === 404 || (withSession && response.status === 401)) return null;
  if (!response.ok) throw new Error(`GET ${path} failed with ${response.status}`);
  return schema.parse(await response.json());
}
