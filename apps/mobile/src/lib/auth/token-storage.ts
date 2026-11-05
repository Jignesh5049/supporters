import type { MobileTokens } from '@supporters/shared';
import * as SecureStore from 'expo-secure-store';
import type { TokenStore } from '../api/client';

/**
 * Tokens live only in the Android Keystore / iOS Keychain, readable while the device is
 * unlocked and never backed up to another device (mobile spec, Security: Token storage).
 */
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

const KEYS = { access: 'auth.access-token', refresh: 'auth.refresh-token' } as const;

/** In-memory copy of the access token so each request skips a Keychain read. */
let cachedAccessToken: string | null | undefined;

type AccessTokenListener = (accessToken: string | null) => void;
const listeners = new Set<AccessTokenListener>();

/**
 * Called after every refresh or sign-in with the new access token, and with null on sign-out,
 * so the realtime socket can send `auth:renew` (mobile spec, Realtime).
 */
export function onAccessTokenChange(listener: AccessTokenListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(accessToken: string | null) {
  for (const listener of listeners) listener(accessToken);
}

export const secureTokenStore: TokenStore = {
  async getAccessToken() {
    if (cachedAccessToken === undefined) {
      cachedAccessToken = await SecureStore.getItemAsync(KEYS.access, OPTIONS);
    }
    return cachedAccessToken;
  },
  getRefreshToken: () => SecureStore.getItemAsync(KEYS.refresh, OPTIONS),
  async setTokens(tokens: MobileTokens) {
    cachedAccessToken = tokens.accessToken;
    await SecureStore.setItemAsync(KEYS.refresh, tokens.refreshToken, OPTIONS);
    await SecureStore.setItemAsync(KEYS.access, tokens.accessToken, OPTIONS);
    notify(tokens.accessToken);
  },
  async clear() {
    cachedAccessToken = null;
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.access, OPTIONS),
      SecureStore.deleteItemAsync(KEYS.refresh, OPTIONS),
    ]);
    notify(null);
  },
};
