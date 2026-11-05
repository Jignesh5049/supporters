import { AppState, type AppStateStatus } from 'react-native';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '../api/config';
import { getAccessToken } from '../storage/secureStore';

export interface ChatMessagePayload {
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
  clientId?: string;
  attachedProduct?: {
    id: string;
    title: string;
    price: number;
    image: string;
  };
  attachedService?: {
    id: string;
    title: string;
    startingPrice: number;
    image: string;
  };
  imageUrl?: string;
}

export interface TypingPayload {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface ReadReceiptPayload {
  conversationId: string;
  messageId: string;
  readAt: string;
}

let socket: Socket | null = null;
let appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;

// Local queue for messages sent while offline/reconnecting (spec line 126)
const unsentQueue: ChatMessagePayload[] = [];

/**
 * Initializes and connects the Socket.IO client with authenticated handshake.
 * Connects to /v1/ws per mobile spec line 125.
 */
export async function getSocket(): Promise<Socket> {
  if (socket && socket.connected) {
    return socket;
  }

  const token = await getAccessToken().catch(() => null);
  const baseUrl = API_URL.replace(/\/v1$/, '');

  socket = io(baseUrl, {
    path: '/v1/ws',
    transports: ['websocket'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    auth: {
      token: token ? `Bearer ${token}` : undefined,
    },
  });

  socket.on('connect', () => {
    // Flush queued messages upon reconnect
    flushUnsentMessages();
  });

  socket.on('connect_error', (err) => {
    console.warn('Realtime socket connection error:', err.message);
  });

  setupSocketLifecycle();

  return socket;
}

/**
 * Disconnects socket when app moves to background; reconnects on foreground (spec line 125).
 */
export function setupSocketLifecycle() {
  if (appStateSubscription) return;

  appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (nextState === 'background' || nextState === 'inactive') {
      disconnectSocket();
    } else if (nextState === 'active') {
      getSocket().catch(() => {});
    }
  });
}

/**
 * Flushes unsent messages queued during disconnect.
 */
function flushUnsentMessages() {
  if (!socket?.connected || unsentQueue.length === 0) return;
  while (unsentQueue.length > 0) {
    const msg = unsentQueue.shift();
    if (msg) {
      socket.emit('message:send', msg);
    }
  }
}

/**
 * Joins a specific conversation chat room.
 */
export function joinConversation(conversationId: string) {
  if (socket?.connected) {
    socket.emit('conversation:join', { conversationId });
  }
}

/**
 * Leaves a specific conversation chat room.
 */
export function leaveConversation(conversationId: string) {
  if (socket?.connected) {
    socket.emit('conversation:leave', { conversationId });
  }
}

/**
 * Sends a chat message through the realtime channel, queuing locally if disconnected.
 */
export function sendSocketMessage(payload: ChatMessagePayload) {
  const clientId =
    payload.clientId || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const messageWithId = { ...payload, clientId };

  if (socket?.connected) {
    socket.emit('message:send', messageWithId);
  } else {
    unsentQueue.push(messageWithId);
  }
}

/**
 * Emits typing status to peers in the conversation.
 */
export function sendTypingStatus(payload: TypingPayload) {
  if (socket?.connected) {
    socket.emit('typing:update', payload);
  }
}

/**
 * Emits a read receipt for a message.
 */
export function sendReadReceipt(payload: ReadReceiptPayload) {
  if (socket?.connected) {
    socket.emit('message:read', payload);
  }
}

/**
 * Subscribes to incoming messages (supporting both message:new and message:received).
 */
export function onSocketMessage(callback: (message: ChatMessagePayload) => void) {
  if (!socket) return () => {};
  socket.on('message:new', callback);
  socket.on('message:received', callback);
  return () => {
    socket?.off('message:new', callback);
    socket?.off('message:received', callback);
  };
}

/**
 * Subscribes to typing status updates.
 */
export function onSocketTyping(callback: (payload: TypingPayload) => void) {
  if (!socket) return () => {};
  socket.on('typing:update', callback);
  return () => {
    socket?.off('typing:update', callback);
  };
}

/**
 * Subscribes to read receipts.
 */
export function onSocketReadReceipt(callback: (payload: ReadReceiptPayload) => void) {
  if (!socket) return () => {};
  socket.on('message:read', callback);
  return () => {
    socket?.off('message:read', callback);
  };
}

/**
 * Emits auth:renew event with a rotated access token per mobile spec line 125.
 */
export function renewSocketAuth(token: string) {
  if (socket?.connected) {
    socket.emit('auth:renew', { token: `Bearer ${token}` });
  }
}

/**
 * Checks whether the realtime socket is currently connected.
 */
export function isSocketConnected(): boolean {
  return !!socket?.connected;
}

/**
 * Disconnects socket on logout or background transition.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
