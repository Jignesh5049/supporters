import {
  getSocket,
  joinConversation,
  leaveConversation,
  sendSocketMessage,
  sendTypingStatus,
  sendReadReceipt,
  renewSocketAuth,
  disconnectSocket,
} from './socketClient';
import { io } from 'socket.io-client';

jest.mock('socket.io-client', () => {
  const mSocket = {
    connected: true,
    emit: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    disconnect: jest.fn(),
  };
  return {
    io: jest.fn(() => mSocket),
  };
});

jest.mock('../storage/secureStore', () => ({
  getAccessToken: jest.fn().mockResolvedValue('test-token-123'),
}));

describe('socketClient', () => {
  let mockSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket = (io as unknown as jest.Mock)();
    mockSocket.connected = true;
  });

  afterEach(() => {
    disconnectSocket();
  });

  it('initializes socket with auth token header', async () => {
    const s = await getSocket();
    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        transports: ['websocket'],
        auth: { token: 'Bearer test-token-123' },
      }),
    );
    expect(s).toBe(mockSocket);
  });

  it('emits conversation:join when joining conversation room', async () => {
    await getSocket();
    joinConversation('conv_456');
    expect(mockSocket.emit).toHaveBeenCalledWith('conversation:join', {
      conversationId: 'conv_456',
    });
  });

  it('emits conversation:leave when leaving room', async () => {
    await getSocket();
    leaveConversation('conv_456');
    expect(mockSocket.emit).toHaveBeenCalledWith('conversation:leave', {
      conversationId: 'conv_456',
    });
  });

  it('emits message:send with full message payload', async () => {
    await getSocket();
    const payload = {
      conversationId: 'conv_456',
      senderId: 'user_1',
      senderName: 'Test Seller',
      text: 'Order dispatched via Delhivery',
      timestamp: new Date().toISOString(),
    };
    sendSocketMessage(payload);
    expect(mockSocket.emit).toHaveBeenCalledWith('message:send', payload);
  });

  it('emits typing:update status', async () => {
    await getSocket();
    sendTypingStatus({
      conversationId: 'conv_456',
      userId: 'user_1',
      userName: 'Test User',
      isTyping: true,
    });
    expect(mockSocket.emit).toHaveBeenCalledWith('typing:update', {
      conversationId: 'conv_456',
      userId: 'user_1',
      userName: 'Test User',
      isTyping: true,
    });
  });

  it('emits message:read receipt', async () => {
    await getSocket();
    sendReadReceipt({
      conversationId: 'conv_456',
      messageId: 'msg_999',
      readAt: '2026-10-31T12:00:00.000Z',
    });
    expect(mockSocket.emit).toHaveBeenCalledWith('message:read', {
      conversationId: 'conv_456',
      messageId: 'msg_999',
      readAt: '2026-10-31T12:00:00.000Z',
    });
  });

  it('emits auth:renew on rotated token', async () => {
    await getSocket();
    renewSocketAuth('new-access-token-999');
    expect(mockSocket.emit).toHaveBeenCalledWith('auth:renew', {
      token: 'Bearer new-access-token-999',
    });
  });

  it('disconnects socket and clears instance', async () => {
    await getSocket();
    disconnectSocket();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });
});
