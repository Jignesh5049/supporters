import { getSession } from '@/dal/session';
import { Header } from './Header';

/** Reads the session on the server and hands the header only the name it shows. */
export async function HeaderWithSession() {
  const session = await getSession();
  return <Header viewer={session ? { name: session.name } : null} />;
}
