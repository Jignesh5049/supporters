import { meSchema, type MobileTokens } from '@supporters/shared';
import { createApiClient, type TokenStore } from './client';
import { ApiError, ApiErrorCode, messageForError } from './errors';

const BASE_URL = 'https://api.example.test/v1';

const ME = {
  id: '6f1c2c1e-8d0e-4c5a-9b1f-2a3b4c5d6e7f',
  name: 'Asha Patel',
  phone: '+919876543210',
  email: null,
  emailVerified: false,
  role: 'user',
  cityId: null,
  createdAt: '2026-10-30T10:00:00.000Z',
};

function memoryTokens(initial: Partial<MobileTokens> = {}): TokenStore & {
  access: string | null;
  refresh: string | null;
} {
  return {
    access: initial.accessToken ?? null,
    refresh: initial.refreshToken ?? null,
    async getAccessToken() {
      return this.access;
    },
    async getRefreshToken() {
      return this.refresh;
    },
    async setTokens(tokens) {
      this.access = tokens.accessToken;
      this.refresh = tokens.refreshToken;
    },
    async clear() {
      this.access = null;
      this.refresh = null;
    },
  };
}

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

const problem = (status: number, code: string, extra: Record<string, unknown> = {}) =>
  json(status, { type: 'about:blank', title: 'raw server text', status, code, ...extra });

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;

function setup(handler: Handler, tokens = memoryTokens()) {
  const fetchMock = jest.fn((url: string, init: RequestInit) =>
    Promise.resolve(handler(url, init)),
  );
  const onSessionExpired = jest.fn();
  const onUpgradeRequired = jest.fn();
  const client = createApiClient({
    baseUrl: BASE_URL,
    appVersion: '1.2.3',
    tokens,
    fetch: fetchMock as unknown as typeof fetch,
    onSessionExpired,
    onUpgradeRequired,
  });
  return { client, tokens, fetchMock, onSessionExpired, onUpgradeRequired };
}

const headersOf = (init: RequestInit) => init.headers as Record<string, string>;
const isRefresh = (url: string) => url.endsWith('/auth/refresh');

describe('createApiClient', () => {
  it('sends the mobile client headers and the bearer token', async () => {
    const { client, fetchMock } = setup(
      () => json(200, ME),
      memoryTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' }),
    );

    await expect(client.request('/me', { schema: meSchema })).resolves.toEqual(ME);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe(`${BASE_URL}/me`);
    expect(headersOf(init)).toMatchObject({
      'X-Client': 'mobile',
      'X-App-Version': '1.2.3',
      Authorization: 'Bearer access-1',
    });
  });

  it('leaves out Authorization for auth: false requests', async () => {
    const { client, fetchMock } = setup(
      () => new Response(null, { status: 202 }),
      memoryTokens({ accessToken: 'access-1' }),
    );

    await client.request('/auth/otp/send', { method: 'POST', body: { a: 1 }, auth: false });

    const init = fetchMock.mock.calls[0]![1];
    expect(headersOf(init).Authorization).toBeUndefined();
    expect(headersOf(init)['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"a":1}');
  });

  it('refreshes once for concurrent 401s, stores the rotated tokens and retries', async () => {
    let refreshCalls = 0;
    const { client, tokens, onSessionExpired } = setup(
      async (url, init) => {
        if (isRefresh(url)) {
          refreshCalls += 1;
          expect(JSON.parse(String(init.body))).toEqual({ refreshToken: 'refresh-1' });
          await new Promise((resolve) => setTimeout(resolve, 10));
          return json(200, { accessToken: 'access-2', refreshToken: 'refresh-2', expiresIn: 900 });
        }
        return headersOf(init).Authorization === 'Bearer access-2'
          ? json(200, ME)
          : problem(401, ApiErrorCode.Unauthenticated);
      },
      memoryTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' }),
    );

    const results = await Promise.all([
      client.request('/me', { schema: meSchema }),
      client.request('/me', { schema: meSchema }),
      client.request('/me', { schema: meSchema }),
    ]);

    expect(results).toEqual([ME, ME, ME]);
    expect(refreshCalls).toBe(1);
    expect(tokens.access).toBe('access-2');
    expect(tokens.refresh).toBe('refresh-2');
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('signs out when the refresh token is rejected', async () => {
    const { client, tokens, onSessionExpired, fetchMock } = setup(
      (url) =>
        isRefresh(url)
          ? problem(401, ApiErrorCode.InvalidRefreshToken)
          : problem(401, ApiErrorCode.Unauthenticated),
      memoryTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' }),
    );

    await expect(client.request('/me', { schema: meSchema })).rejects.toMatchObject({
      status: 401,
      code: ApiErrorCode.Unauthenticated,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(tokens.access).toBeNull();
    expect(tokens.refresh).toBeNull();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('signs out when the retried request is still a 401', async () => {
    const { client, tokens, onSessionExpired, fetchMock } = setup(
      (url) =>
        isRefresh(url)
          ? json(200, { accessToken: 'access-2', refreshToken: 'refresh-2', expiresIn: 900 })
          : problem(401, ApiErrorCode.Unauthenticated),
      memoryTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' }),
    );

    await expect(client.request('/me', { schema: meSchema })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(tokens.refresh).toBeNull();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('keeps the session when the refresh fails for a transient reason', async () => {
    const { client, tokens, onSessionExpired } = setup(
      (url) => {
        if (isRefresh(url)) throw new TypeError('Network request failed');
        return problem(401, ApiErrorCode.Unauthenticated);
      },
      memoryTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' }),
    );

    await expect(client.request('/me', { schema: meSchema })).rejects.toMatchObject({
      code: ApiErrorCode.NetworkError,
    });
    expect(tokens.refresh).toBe('refresh-1');
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('does not sign out a guest who hits a protected endpoint', async () => {
    const { client, onSessionExpired, fetchMock } = setup(() =>
      problem(401, ApiErrorCode.Unauthenticated),
    );

    await expect(client.request('/me', { schema: meSchema })).rejects.toMatchObject({
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('reports 426 as a blocking upgrade', async () => {
    const { client, onUpgradeRequired } = setup(() => new Response(null, { status: 426 }));

    await expect(client.request('/me', { auth: false })).rejects.toMatchObject({
      status: 426,
      code: ApiErrorCode.UpgradeRequired,
    });
    expect(onUpgradeRequired).toHaveBeenCalledTimes(1);
  });

  it('maps problem details by code and never keeps the raw title', async () => {
    const { client } = setup(() =>
      problem(400, ApiErrorCode.ValidationFailed, {
        requestId: 'req-1',
        errors: [{ path: 'body.phone', message: 'Enter a +91 mobile number' }],
      }),
    );

    const error = await client.request('/auth/login', { auth: false }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: ApiErrorCode.ValidationFailed,
      requestId: 'req-1',
      fieldErrors: [{ path: 'body.phone', message: 'Enter a +91 mobile number' }],
    });
    expect(messageForError(error)).not.toContain('raw server text');
  });

  it('reads Retry-After on 429', async () => {
    const { client } = setup(() =>
      json(429, { status: 429, code: ApiErrorCode.RateLimited }, { 'Retry-After': '30' }),
    );

    await expect(client.request('/x', { auth: false })).rejects.toMatchObject({
      code: ApiErrorCode.RateLimited,
      retryAfterSec: 30,
    });
  });

  it('falls back to a status code when the error body is not problem details', async () => {
    const { client } = setup(() => new Response('<html>bad gateway</html>', { status: 503 }));

    await expect(client.request('/x', { auth: false })).rejects.toMatchObject({
      status: 503,
      code: ApiErrorCode.ServiceUnavailable,
    });
  });

  it('rejects a response that does not match the shared schema', async () => {
    const { client } = setup(() => json(200, { id: 'not-a-uuid' }));

    await expect(client.request('/me', { schema: meSchema, auth: false })).rejects.toMatchObject({
      code: ApiErrorCode.InvalidResponse,
    });
  });

  it('refreshSession reports whether a session could be restored', async () => {
    const withSession = setup(
      () => json(200, { accessToken: 'access-2', refreshToken: 'refresh-2', expiresIn: 900 }),
      memoryTokens({ refreshToken: 'refresh-1' }),
    );
    await expect(withSession.client.refreshSession()).resolves.toBe(true);
    expect(withSession.tokens.access).toBe('access-2');

    const guest = setup(() => json(500, {}));
    await expect(guest.client.refreshSession()).resolves.toBe(false);
    expect(guest.fetchMock).not.toHaveBeenCalled();
  });
});

describe('messageForError', () => {
  it('maps known codes and falls back for unknown values', () => {
    expect(messageForError(new ApiError(401, ApiErrorCode.InvalidCredentials))).toMatch(
      /don't match/,
    );
    expect(messageForError(new ApiError(0, ApiErrorCode.NetworkError))).toMatch(/connection/);
    expect(messageForError(new ApiError(418, 'SOMETHING_NEW'))).toBe(
      'Something went wrong. Try again.',
    );
    expect(messageForError(new Error('boom'))).toBe('Something went wrong. Try again.');
  });
});
