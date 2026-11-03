import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

/**
 * Hook to prevent screen recording and screenshots on sensitive screens (e.g. OTP, Wallet, Withdrawal).
 * Automatically enables prevention on mount and disables on unmount.
 */
export function useScreenSecurity(key?: string) {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let isMounted = true;

    ScreenCapture.preventScreenCaptureAsync(key).catch(() => {
      // Ignore if screen capture prevention is unsupported or fails silently
    });

    return () => {
      isMounted = false;
      ScreenCapture.allowScreenCaptureAsync(key).catch(() => {
        // Ignore
      });
    };
  }, [key]);
}
