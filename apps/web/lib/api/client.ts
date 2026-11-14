import {
  CSRF_HEADER,
  SESSION_COOKIE,
  adminLoginUrlFor,
  loginUrlFor,
} from '@/lib/auth/session-cookies';
import { ApiError, toApiError } from './errors';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: Method;
  body?: unknown;
  signal?: AbortSignal;
  /** Extra headers such as `idempotency-key`. The client's own headers win over these. */
  headers?: Record<string, string>;
}

export interface ApiClientDeps {
  fetch: typeof fetch;
  /** Reads a cookie visible to scripts (only `__Host-csrf` is). */
  readCookie: (name: string) => string | undefined;
  /** Called when the session cannot be refreshed. */
  onSessionExpired: () => void;
}

/** Auth calls that answer 401 for a bad password or code, not an expired session. */
const NO_REFRESH_PATHS = ['/v1/auth/', '/v1/admin/auth/'];

export function createApiClient(deps: ApiClientDeps) {
  let refreshing: Promise<boolean> | null = null;

  /** One refresh at a time: concurrent 401s all wait on the same call. */
  function refreshOnce(): Promise<boolean> {
    refreshing ??= send('/v1/auth/refresh', { method: 'POST' })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
    return refreshing;
  }

  function send(path: string, { method = 'GET', body, signal, headers: extra }: RequestOptions) {
    const headers: Record<string, string> = { ...extra, accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (method !== 'GET') {
      const csrf = deps.readCookie(SESSION_COOKIE.csrf);
      if (csrf) headers[CSRF_HEADER] = csrf;
    }
    return deps.fetch(path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
      signal,
    });
  }

  async function request<T = void>(
    path: `/v1/${string}`,
    options: RequestOptions = {},
  ): Promise<T> {
    let response: Response;
    try {
      response = await send(path, options);
      if (response.status === 401 && !NO_REFRESH_PATHS.some((p) => path.startsWith(p))) {
        if (await refreshOnce()) {
          response = await send(path, options);
        } else {
          deps.onSessionExpired();
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ApiError({ status: 0, code: 'NETWORK_ERROR', title: 'Network error' });
    }

    if (!response.ok) throw await toApiError(response);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  return { request, refresh: refreshOnce };
}

function readBrowserCookie(name: string): string | undefined {
  const prefix = `${name}=`;
  const match = document.cookie.split('; ').find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : undefined;
}

/** The browser client. Same origin as the page, so `/v1/*` carries the session cookies. */
export const api = createApiClient({
  fetch: (...args) => fetch(...args),
  readCookie: readBrowserCookie,
  onSessionExpired: () => {
    const { pathname, search } = window.location;
    const next = `${pathname}${search}`;
    const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
    window.location.assign(isAdmin ? adminLoginUrlFor(next) : loginUrlFor(next));
  },
});
