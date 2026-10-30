import 'server-only';
import { meSchema } from '@supporters/shared';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { SESSION_COOKIE, loginUrlFor } from '@/lib/auth/session-cookies';
import { apiUrl } from './config';

/** What pages may know about the signed-in user. Never tokens or contact details. */
export interface Session {
  userId: string;
  name: string;
  role: 'user' | 'admin';
}

/**
 * The real session check: `GET /v1/me` with the access cookie the proxy just
 * refreshed. Deduplicated per request with React `cache()`. Returns null when
 * signed out; throws when the API fails, so an outage never looks like a sign-out.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const access = (await cookies()).get(SESSION_COOKIE.access)?.value;
  if (!access) return null;

  const requestId = (await headers()).get('x-request-id');
  const response = await fetch(apiUrl('/v1/me'), {
    headers: {
      cookie: `${SESSION_COOKIE.access}=${access}`,
      ...(requestId ? { 'x-request-id': requestId } : {}),
    },
    cache: 'no-store',
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(`GET /v1/me failed with ${response.status}`);

  const me = meSchema.parse(await response.json());
  return { userId: me.id, name: me.name, role: me.role };
});

/** For signed-in pages: the session, or a redirect to login that returns to `path`. */
export async function requireSession(path: string): Promise<Session> {
  const session = await getSession();
  if (!session) redirect(loginUrlFor(path));
  return session;
}
