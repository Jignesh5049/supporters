import type { AuthResponse, Me } from '@supporters/shared';
import { useSessionStore } from '../../stores/session-store';
import { ApiError, ApiErrorCode, apiClient, authApi } from '../api';
import { queryClient } from '../query-client';
import { secureTokenStore } from './token-storage';

/**
 * Cold start (mobile spec, Auth flow step 3): with a stored refresh token, refresh silently
 * and load the profile; without one, open in guest mode.
 */
export async function restoreSession(): Promise<void> {
  const store = useSessionStore.getState();
  try {
    if (!(await apiClient.refreshSession())) {
      store.setGuest();
      return;
    }
    store.setSignedIn(await authApi.me());
  } catch {
    // Offline or the API is down: keep the tokens for the next launch and browse as a guest.
    store.setGuest();
  }
}

/** Stores the tokens from login or register, then marks the session signed in. */
export async function completeSignIn(response: AuthResponse): Promise<Me> {
  const { user, accessToken, refreshToken, expiresIn } = response;
  if (!accessToken || !refreshToken || expiresIn === undefined) {
    // The API only omits tokens for web clients, so this means X-Client was dropped.
    throw new ApiError(200, ApiErrorCode.InvalidResponse);
  }
  await secureTokenStore.setTokens({ accessToken, refreshToken, expiresIn });
  queryClient.clear();
  useSessionStore.getState().setSignedIn(user);
  return user;
}

/** Sign-out (Auth flow step 4): revoke on the server if reachable, then wipe local state. */
export async function signOut(): Promise<void> {
  const refreshToken = await secureTokenStore.getRefreshToken();
  try {
    if (refreshToken) await authApi.logout(refreshToken);
  } catch {
    // Signing out must work offline; the server session expires on its own.
  }
  await secureTokenStore.clear();
  queryClient.clear();
  useSessionStore.getState().setGuest();
}
