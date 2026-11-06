import { io } from 'socket.io-client';
import { chatApi } from '@/features/messaging/chat-api';
import { api } from '@/lib/api/client';
import { loginUrlFor } from '@/lib/auth/session-cookies';
import { type ChatSocket, type SocketLike, createChatSocket } from './chat-socket';

/** The API's Socket.IO path, on the page's own origin (CloudFront routes `/v1/*` to the API). */
export const CHAT_SOCKET_PATH = '/v1/ws';

let instance: ChatSocket | null = null;

/** The tab's one chat connection. Created lazily; `start()` connects it. */
export function getChatSocket(): ChatSocket {
  instance ??= createChatSocket({
    createSocket: () =>
      // Websocket only: long-polling would need sticky sessions across API instances.
      io({
        path: CHAT_SOCKET_PATH,
        transports: ['websocket'],
        withCredentials: true,
        autoConnect: false,
      }) as unknown as SocketLike,
    refresh: () => api.refresh(),
    onSessionExpired: () => {
      const { pathname, search } = window.location;
      window.location.assign(loginUrlFor(`${pathname}${search}`));
    },
    sendRest: (conversationId, clientId, input) => chatApi.send(conversationId, clientId, input),
    markReadRest: (conversationId, messageId) => chatApi.markRead(conversationId, messageId),
  });
  return instance;
}
