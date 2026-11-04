import { io, type Socket } from 'socket.io-client';
import { vi } from 'vitest';
import type { App } from '../app';
import { APP_ORIGIN, type MobileSession } from './helpers';

const open = new Set<Socket>();

/** Listens on a free local port and returns the base URL. */
export async function listen(app: App): Promise<string> {
  await app.listen({ host: '127.0.0.1', port: 0 });
  const address = app.server.address();
  if (typeof address !== 'object' || address === null) throw new Error('no address');
  return `http://127.0.0.1:${address.port}`;
}

export interface ConnectOptions {
  /** Mobile: `auth.token`. */
  token?: string;
  /** Web: the access cookie, sent with Origin. */
  cookie?: string;
  origin?: string;
}

/** Opens a socket and resolves once connected; rejects with the handshake error message. */
export function connect(url: string, options: ConnectOptions): Promise<Socket> {
  const headers: Record<string, string> = {};
  if (options.cookie) headers.cookie = `__Host-at=${options.cookie}`;
  if (options.origin) headers.origin = options.origin;
  const socket = io(url, {
    path: '/v1/ws',
    transports: ['websocket'],
    reconnection: false,
    forceNew: true,
    extraHeaders: headers,
    ...(options.token ? { auth: { token: options.token } } : {}),
  });
  open.add(socket);
  return new Promise((resolve, reject) => {
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', (error) => {
      socket.close();
      reject(error);
    });
  });
}

export const asMobile = (url: string, session: MobileSession) =>
  connect(url, { token: session.accessToken });

/** A browser: cookie plus the app origin. */
export const asWeb = (url: string, session: MobileSession) =>
  connect(url, { cookie: session.accessToken, origin: APP_ORIGIN });

export function closeSockets() {
  for (const socket of open) socket.close();
  open.clear();
}

/** Everything a socket receives for `event`, from now on. */
export function collect<T = unknown>(socket: Socket, event: string): T[] {
  const received: T[] = [];
  socket.on(event, (payload: T) => received.push(payload));
  return received;
}

/** Emits with an ack and returns the ack payload. */
export function ask<T = Record<string, unknown>>(
  socket: Socket,
  event: string,
  payload: unknown,
): Promise<T> {
  return socket.timeout(5_000).emitWithAck(event, payload) as Promise<T>;
}

export const until = <T>(check: () => T, timeout = 5_000) =>
  vi.waitFor(check, { timeout, interval: 25 });

/** Waits long enough for an event that should NOT arrive to have arrived. */
export const quiet = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));
