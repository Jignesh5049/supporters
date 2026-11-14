import 'server-only';
import { notFound } from 'next/navigation';
import { type Session, getSession } from './session';

/**
 * The `(admin)` layout check (web spec, Admin area): an admin session, or a
 * 404 so the area doesn't reveal itself. The API's admin guard checks again
 * on every `/v1/admin/*` call, including the TOTP claim and session expiry.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await getSession();
  if (session?.role !== 'admin') notFound();
  return session;
}
