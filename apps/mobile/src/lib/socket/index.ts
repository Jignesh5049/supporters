import { io, type Socket } from 'socket.io-client';
import { useSessionStore } from '../../stores/session-store';
import { apiClient, chatApi } from '../api';
import { API_URL } from '../api/config';
import { onAccessTokenChange, secureTokenStore } from '../auth/token-storage';
import { getEncryptedStorage } from '../storage/encrypted-storage';
import { createOutbox, type Outbox } from './outbox';
import { createRealtimeClient, type RealtimeSocket, type SocketOptions } from './socketClient';

export type { ConnectionStatus, RealtimeClient, RealtimeEvents } from './socketClient';
export type { OutboxItem } from './outbox';

const api = new URL(API_URL);
/** `https://host/v1` serves Socket.IO at `/v1/ws` on the same origin (backend spec, Realtime). */
const SOCKET_PATH = `${api.pathname.replace(/\/+$/, '')}/ws`;

function adapt(socket: Socket): RealtimeSocket {
  return {
    get connected() {
      return socket.connected;
    },
    get active() {
      return socket.active;
    },
    connect: () => {
      socket.connect();
    },
    disconnect: () => {
      socket.disconnect();
    },
    on: (event, listener) => {
      socket.on(event, listener);
    },
    emit: (event, payload) => {
      socket.emit(event, payload);
    },
    emitWithAck: (event, payload, timeoutMs) =>
      socket.timeout(timeoutMs).emitWithAck(event, payload),
  };
}

function createSocket(url: string, options: SocketOptions): RealtimeSocket {
  return adapt(
    io(url, {
      path: options.path,
      auth: options.auth,
      // React Native has no cookies or long-polling quirks to support: WebSocket only.
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 30_000,
    }),
  );
}

let outbox: Promise<Outbox> | null = null;

/** The app's one realtime connection (mobile spec, Realtime). */
export const realtime = createRealtimeClient({
  url: api.origin,
  path: SOCKET_PATH,
  createSocket,
  getToken: () => secureTokenStore.getAccessToken(),
  refresh: () => apiClient.refreshSession(),
  getOutbox: () => {
    outbox ??= getEncryptedStorage().then(createOutbox, (error: unknown) => {
      outbox = null;
      throw error;
    });
    return outbox;
  },
  getUserId: () => useSessionStore.getState().user?.id ?? null,
  sendViaRest: async (item) => {
    const message = await chatApi.send(item.conversationId, item.clientId, item.draft);
    return { id: message.id, createdAt: message.createdAt, message };
  },
  markReadViaRest: (conversationId, messageId) => chatApi.markRead(conversationId, messageId),
});

// Every refresh hands the live socket its new token; sign-out drops the socket.
onAccessTokenChange((token) => {
  if (token) void realtime.renew(token);
  else realtime.stop();
});
