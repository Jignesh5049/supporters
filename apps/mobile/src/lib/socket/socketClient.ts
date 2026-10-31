import { io, Socket } from 'socket.io-client';
import { API_URL } from '../api/config';
import { getAccessToken } from '../storage/secureStore';

export interface ChatMessagePayload {
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
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

/**
 * Initializes and connects the Socket.IO client with authenticated handshake.
 */
export async function getSocket(): Promise<Socket> {
  if (socket && socket.connected) {
    return socket;
  }

  const token = await getAccessToken().catch(() => null);
  const baseUrl = API_URL.replace(/\/v1$/, '');

  socket = io(baseUrl, {
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
    // Connected to realtime server
  });

  socket.on('connect_error', (err) => {
    console.warn('Realtime socket connection error:', err.message);
  });

  return socket;
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
 * Sends a chat message through the realtime channel.
 */
export function sendSocketMessage(payload: ChatMessagePayload) {
  if (socket?.connected) {
    socket.emit('message:send', payload);
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
 * Subscribes to incoming messages.
 */
export function onSocketMessage(callback: (message: ChatMessagePayload) => void) {
  if (!socket) return () => {};
  socket.on('message:received', callback);
  return () => {
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
 * Disconnects socket on logout.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
