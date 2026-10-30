import * as SecureStore from 'expo-secure-store';
import { secureTokenStore } from './token-storage';

const tokens = { accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 900 };

describe('secureTokenStore', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes both tokens to SecureStore, device-only and while unlocked', async () => {
    await secureTokenStore.setTokens(tokens);

    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);
    for (const [, , options] of jest.mocked(SecureStore.setItemAsync).mock.calls) {
      expect(options).toEqual({ keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY });
    }
    await expect(secureTokenStore.getRefreshToken()).resolves.toBe('refresh-1');
    await expect(secureTokenStore.getAccessToken()).resolves.toBe('access-1');
  });

  it('serves the access token from memory after the first read', async () => {
    await secureTokenStore.setTokens(tokens);
    jest.clearAllMocks();

    await secureTokenStore.getAccessToken();
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
  });

  it('clear deletes both tokens', async () => {
    await secureTokenStore.setTokens(tokens);
    await secureTokenStore.clear();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(2);
    await expect(secureTokenStore.getAccessToken()).resolves.toBeNull();
    await expect(secureTokenStore.getRefreshToken()).resolves.toBeNull();
  });
});
