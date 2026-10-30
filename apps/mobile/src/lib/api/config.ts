import Constants from 'expo-constants';
import { Platform } from 'react-native';

/** The Android emulator reaches the host machine on 10.0.2.2; the iOS simulator shares it. */
const DEV_FALLBACK_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:3001/v1' : 'http://127.0.0.1:3001/v1';

/**
 * Validates the API base URL. Release builds must use HTTPS (mobile spec, Security:
 * Transport); development builds may use plain HTTP to reach a local API.
 */
export function resolveApiUrl(raw: string | undefined, isDev: boolean): string {
  const value = raw?.trim() || (isDev ? DEV_FALLBACK_URL : '');
  if (!value) throw new Error('EXPO_PUBLIC_API_URL is not set');
  const url = new URL(value);
  if (url.protocol !== 'https:' && !(isDev && url.protocol === 'http:')) {
    throw new Error('EXPO_PUBLIC_API_URL must use https');
  }
  return value.replace(/\/+$/, '');
}

// Read as a literal `process.env.EXPO_PUBLIC_*` so Expo inlines it at build time.
export const API_URL = resolveApiUrl(process.env.EXPO_PUBLIC_API_URL, __DEV__);

export const APP_VERSION = Constants.expoConfig?.version ?? '0.0.0';
