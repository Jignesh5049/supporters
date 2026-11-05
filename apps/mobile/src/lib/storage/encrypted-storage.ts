import { getRandomBytesAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import type { MMKV } from 'react-native-mmkv';

/** The small key-value surface the app uses, so tests can pass a Map-backed fake. */
export interface KeyValueStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
}

const KEY_NAME = 'storage.mmkv-key';
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

let instance: Promise<MMKV> | null = null;

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

async function open(): Promise<MMKV> {
  let key = await SecureStore.getItemAsync(KEY_NAME, OPTIONS);
  if (!key) {
    // 16 random bytes as 32 hex characters: the 32-byte key AES-256 takes.
    key = toHex(await getRandomBytesAsync(16));
    await SecureStore.setItemAsync(KEY_NAME, key, OPTIONS);
  }
  // Loaded on first use: the native module is not needed (or present) until a thread is sent.
  const { createMMKV } = await import('react-native-mmkv');
  return createMMKV({ id: 'supporters.private', encryptionKey: key, encryptionType: 'AES-256' });
}

/**
 * The on-device cache for private data (the chat outbox). Encrypted with a random key kept
 * in SecureStore, and wiped on sign-out (mobile spec, Security: Cached data).
 */
function getMMKV(): Promise<MMKV> {
  instance ??= open().catch((error: unknown) => {
    instance = null;
    throw error;
  });
  return instance;
}

export function getEncryptedStorage(): Promise<KeyValueStore> {
  return getMMKV();
}

/** Sign-out: drop every entry. The key stays; the store is empty for the next account. */
export async function wipeEncryptedStorage(): Promise<void> {
  try {
    (await getMMKV()).clearAll();
  } catch {
    // No key in SecureStore yet means nothing was ever stored.
  }
}
