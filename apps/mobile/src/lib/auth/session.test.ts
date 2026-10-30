import * as SecureStore from 'expo-secure-store';
import { SessionStatus, useSessionStore } from '../../stores/session-store';
import { resolveApiUrl } from '../api/config';
import { queryClient } from '../query-client';
import { completeSignIn, restoreSession, signOut } from './session';
import { secureTokenStore } from './token-storage';

const ME = {
  id: '6f1c2c1e-8d0e-4c5a-9b1f-2a3b4c5d6e7f',
  name: 'Asha Patel',
  phone: '+919876543210',
  email: null,
  emailVerified: false,
  role: 'user' as const,
  cityId: null,
  createdAt: '2026-10-30T10:00:00.000Z',
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const fetchMock = jest.spyOn(globalThis, 'fetch');
const initialState = useSessionStore.getState();

beforeEach(async () => {
  fetchMock.mockReset();
  useSessionStore.setState(initialState, true);
  await secureTokenStore.clear();
});

describe('restoreSession', () => {
  it('opens in guest mode without a refresh token, with no network call', async () => {
    await restoreSession();

    expect(useSessionStore.getState().status).toBe(SessionStatus.Guest);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refreshes silently, then loads the profile', async () => {
    await secureTokenStore.setTokens({ accessToken: 'a1', refreshToken: 'r1', expiresIn: 900 });
    fetchMock
      .mockResolvedValueOnce(json(200, { accessToken: 'a2', refreshToken: 'r2', expiresIn: 900 }))
      .mockResolvedValueOnce(json(200, ME));

    await restoreSession();

    expect(useSessionStore.getState()).toMatchObject({ status: SessionStatus.SignedIn, user: ME });
    expect(String(fetchMock.mock.calls[1]![0])).toMatch(/\/me$/);
    await expect(secureTokenStore.getRefreshToken()).resolves.toBe('r2');
  });

  it('wipes a rejected refresh token and opens as a guest', async () => {
    await secureTokenStore.setTokens({ accessToken: 'a1', refreshToken: 'r1', expiresIn: 900 });
    fetchMock.mockResolvedValueOnce(json(401, { status: 401, code: 'INVALID_REFRESH_TOKEN' }));

    await restoreSession();

    expect(useSessionStore.getState().status).toBe(SessionStatus.Guest);
    await expect(secureTokenStore.getRefreshToken()).resolves.toBeNull();
  });
});

describe('completeSignIn and signOut', () => {
  it('stores tokens on sign-in, then revokes and wipes everything on sign-out', async () => {
    await completeSignIn({ user: ME, accessToken: 'a1', refreshToken: 'r1', expiresIn: 900 });
    expect(useSessionStore.getState().status).toBe(SessionStatus.SignedIn);
    await expect(secureTokenStore.getRefreshToken()).resolves.toBe('r1');

    queryClient.setQueryData(['private'], { secret: true });
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await signOut();

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toMatch(/\/auth\/logout$/);
    expect(JSON.parse(String(init?.body))).toEqual({ refreshToken: 'r1' });
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
    await expect(secureTokenStore.getRefreshToken()).resolves.toBeNull();
    expect(queryClient.getQueryData(['private'])).toBeUndefined();
    expect(useSessionStore.getState()).toMatchObject({ status: SessionStatus.Guest, user: null });
  });

  it('signs out locally when the API is unreachable', async () => {
    await completeSignIn({ user: ME, accessToken: 'a1', refreshToken: 'r1', expiresIn: 900 });
    fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));

    await signOut();

    await expect(secureTokenStore.getRefreshToken()).resolves.toBeNull();
    expect(useSessionStore.getState().status).toBe(SessionStatus.Guest);
  });

  it('rejects an auth response without tokens', async () => {
    await expect(completeSignIn({ user: ME })).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
    expect(useSessionStore.getState().status).toBe(SessionStatus.Restoring);
  });
});

describe('resolveApiUrl', () => {
  it('requires https outside development', () => {
    expect(resolveApiUrl('https://api.example.test/v1/', false)).toBe(
      'https://api.example.test/v1',
    );
    expect(() => resolveApiUrl('http://api.example.test/v1', false)).toThrow(/https/);
    expect(() => resolveApiUrl(undefined, false)).toThrow(/not set/);
    expect(resolveApiUrl('http://10.0.2.2:3001/v1', true)).toBe('http://10.0.2.2:3001/v1');
  });
});
