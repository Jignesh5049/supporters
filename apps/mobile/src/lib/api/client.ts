import { mobileTokensSchema, type MobileTokens } from '@supporters/shared';
import type { z } from 'zod';
import { ApiError, ApiErrorCode, toApiError } from './errors';

/** Where the client keeps tokens. The app uses SecureStore; tests pass an in-memory one. */
export interface TokenStore {
  getAccessToken(): Promise<string | null>;
  getRefreshToken(): Promise<string | null>;
  setTokens(tokens: MobileTokens): Promise<void>;
  clear(): Promise<void>;
}

export interface ApiClientOptions {
  baseUrl: string;
  appVersion: string;
  tokens: TokenStore;
  fetch?: typeof fetch;
  /** The refresh token was rejected: tokens are already wiped, reset the UI to guest. */
  onSessionExpired?: () => void;
  /** The API answered 426: show the blocking "Update the app" screen. */
  onUpgradeRequired?: () => void;
}

export interface RequestOptions<T> {
  method?: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Parses a JSON response. Without one the response body is ignored. */
  schema?: z.ZodType<T>;
  /** Send the access token and refresh it on a 401. Defaults to true. */
  auth?: boolean;
  /** Extra headers such as `Idempotency-Key`. They never replace the client's own headers. */
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export interface ApiClient {
  request<T = void>(path: string, options?: RequestOptions<T>): Promise<T>;
  /**
   * Follows a signed-in redirect (a private chat file) with a HEAD request and resolves the
   * URL it ends at, without downloading the file.
   */
  resolveRedirect(path: string): Promise<string>;
  /** Exchanges the stored refresh token for new tokens. Resolves false when there's no session. */
  refreshSession(): Promise<boolean>;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const { baseUrl, appVersion, tokens, onSessionExpired, onUpgradeRequired } = options;
  // Looked up per call so a fetch installed later (polyfill, test spy) is used.
  const fetchImpl: typeof fetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init));
  let refreshing: Promise<string | null> | null = null;

  async function send(
    path: string,
    init: RequestOptions<unknown>,
    accessToken: string | null,
  ): Promise<Response> {
    const headers: Record<string, string> = {
      ...init.headers,
      Accept: 'application/json',
      'X-Client': 'mobile',
      'X-App-Version': appVersion,
    };
    if (init.body !== undefined) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method: init.method ?? 'GET',
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: init.signal,
      });
    } catch (error) {
      if (init.signal?.aborted) throw error;
      throw new ApiError(0, ApiErrorCode.NetworkError);
    }
    if (response.status === 426) {
      onUpgradeRequired?.();
      throw new ApiError(426, ApiErrorCode.UpgradeRequired);
    }
    return response;
  }

  async function parse<T>(response: Response, schema: z.ZodType<T> | undefined): Promise<T> {
    if (!response.ok) throw await toApiError(response);
    // Callers without a schema expect no body (T is void).
    if (!schema || response.status === 204) return undefined as T;
    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new ApiError(response.status, ApiErrorCode.InvalidResponse);
    }
    const result = schema.safeParse(json);
    if (!result.success) throw new ApiError(response.status, ApiErrorCode.InvalidResponse);
    return result.data;
  }

  /** Resolves the new access token, or null when the session is gone. */
  async function rotate(): Promise<string | null> {
    const refreshToken = await tokens.getRefreshToken();
    if (!refreshToken) return null;
    const response = await send('/auth/refresh', { method: 'POST', body: { refreshToken } }, null);
    // 401 means the refresh token is invalid, expired or reused: the session is over.
    // Anything else (offline, 429, 5xx) throws and leaves the tokens in place.
    if (response.status === 401) return null;
    const next = await parse(response, mobileTokensSchema);
    await tokens.setTokens(next);
    return next.accessToken;
  }

  /** Concurrent callers share one refresh call. */
  function sharedRefresh(): Promise<string | null> {
    refreshing ??= rotate().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  async function expireSession(): Promise<void> {
    await tokens.clear();
    onSessionExpired?.();
  }

  async function request<T = void>(path: string, init: RequestOptions<T> = {}): Promise<T> {
    if (init.auth === false) return parse(await send(path, init, null), init.schema);

    const usedToken = await tokens.getAccessToken();
    let response = await send(path, init, usedToken);
    if (response.status !== 401) return parse(response, init.schema);

    const hadSession = usedToken !== null || (await tokens.getRefreshToken()) !== null;
    // Another request may have refreshed while this one was in flight: reuse its token.
    const current = await tokens.getAccessToken();
    const fresh = current && current !== usedToken ? current : await sharedRefresh();
    if (!fresh) {
      if (hadSession) await expireSession();
      return parse(response, init.schema);
    }
    response = await send(path, init, fresh);
    if (response.status === 401) await expireSession();
    return parse(response, init.schema);
  }

  async function resolveRedirect(path: string): Promise<string> {
    const head: RequestOptions<unknown> = { method: 'HEAD' };
    let response = await send(path, head, await tokens.getAccessToken());
    if (response.status === 401) {
      const fresh = await sharedRefresh();
      if (!fresh) {
        await expireSession();
        throw await toApiError(response);
      }
      response = await send(path, head, fresh);
    }
    // Only the API's own answer counts: storage may refuse a HEAD on a link signed for GET.
    if (!response.url || response.url === `${baseUrl}${path}`) {
      if (!response.ok) throw await toApiError(response);
      throw new ApiError(response.status, ApiErrorCode.InvalidResponse);
    }
    return response.url;
  }

  return {
    request,
    resolveRedirect,
    refreshSession: async () => {
      const fresh = await sharedRefresh();
      if (!fresh) await tokens.clear();
      return fresh !== null;
    },
  };
}
