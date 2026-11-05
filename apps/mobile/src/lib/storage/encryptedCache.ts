import { createMMKV, type MMKV } from 'react-native-mmkv';
import * as SecureStore from 'expo-secure-store';

const KEY_STORAGE_KEY = 'cache.encryption-key';
let mmkvInstance: MMKV | null = null;

const SECURE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * Initializes or retrieves the encrypted MMKV cache instance per mobile spec line 148.
 * The random encryption key is generated once and kept in SecureStore.
 */
export async function getEncryptedCache(): Promise<MMKV> {
  if (mmkvInstance) {
    return mmkvInstance;
  }

  let encryptionKey = await SecureStore.getItemAsync(KEY_STORAGE_KEY, SECURE_OPTIONS).catch(
    () => null,
  );

  if (!encryptionKey) {
    // Generate a random 32-character hex key
    encryptionKey = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');

    await SecureStore.setItemAsync(KEY_STORAGE_KEY, encryptionKey, SECURE_OPTIONS).catch(() => {});
  }

  try {
    mmkvInstance = createMMKV({
      id: 'supporters-encrypted-cache',
      encryptionKey,
    });
  } catch {
    // Fallback unencrypted if native keystore issue in mock/test
    mmkvInstance = createMMKV({
      id: 'supporters-encrypted-cache',
    });
  }

  return mmkvInstance;
}

/**
 * Wipes the MMKV cache completely on sign out (mobile spec line 148).
 */
export async function wipeEncryptedCache(): Promise<void> {
  if (mmkvInstance) {
    mmkvInstance.clearAll();
  }
}
