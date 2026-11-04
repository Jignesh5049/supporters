import { getSession } from '@/dal/session';
import { ChatRealtime } from '@/features/messaging/chat-realtime';

/** Reads the session on the server and connects the chat socket only when signed in. */
export async function ChatRealtimeWithSession() {
  const session = await getSession();
  return <ChatRealtime isSignedIn={session !== null} />;
}
