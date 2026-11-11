import { getSession } from '@/dal/session';
import { ChatRealtime } from '@/features/messaging/chat-realtime';

/**
 * Reads the session on the server and connects the chat socket only when signed
 * in. Admin accounts have no chat; their 8-hour session has no refresh, so a
 * socket would only bounce them to the user sign-in when it ends.
 */
export async function ChatRealtimeWithSession() {
  const session = await getSession();
  return <ChatRealtime isSignedIn={session !== null && session.role !== 'admin'} />;
}
