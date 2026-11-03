import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'supporters_access_token';
const REFRESH_TOKEN_KEY = 'supporters_refresh_token';

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * Persists auth tokens securely into OS-level keychain / keystore.
 */
export async function saveAuthTokens(accessToken: string, refreshToken?: string): Promise<void> {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken, SECURE_STORE_OPTIONS);
  if (refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken, SECURE_STORE_OPTIONS);
  }
}

/**
 * Retrieves the stored access token.
 */
export async function getAccessToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY, SECURE_STORE_OPTIONS);
}

/**
 * Retrieves the stored refresh token.
 */
export async function getRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY, SECURE_STORE_OPTIONS);
}

/**
 * Clears all auth tokens on logout or session expiration.
 */
export async function clearAuthTokens(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY, SECURE_STORE_OPTIONS).catch(() => {}),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY, SECURE_STORE_OPTIONS).catch(() => {}),
  ]);
}
