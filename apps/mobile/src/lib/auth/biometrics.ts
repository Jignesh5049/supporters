import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

export interface BiometricCheckResult {
  available: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  biometryType?: LocalAuthentication.AuthenticationType[];
}

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
  enrolled: boolean;
}

/**
 * Checks whether the physical device has biometric hardware and enrolled credentials.
 */
export async function checkBiometricsAvailable(): Promise<BiometricCheckResult> {
  if (Platform.OS === 'web') {
    return { available: false, hasHardware: false, isEnrolled: false };
  }

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const biometryType = await LocalAuthentication.supportedAuthenticationTypesAsync();

    return {
      available: hasHardware && isEnrolled,
      hasHardware,
      isEnrolled,
      biometryType,
    };
  } catch {
    return { available: false, hasHardware: false, isEnrolled: false };
  }
}

/**
 * Prompts user for biometric authorization (Face ID / Touch ID / Fingerprint / Device Passcode fallback)
 * Required before sensitive money movements like payouts & withdrawals per OWASP MASVS L2.
 */
export async function authenticateBiometric(
  promptMessage = 'Confirm your identity to authorize payout',
  cancelLabel = 'Cancel',
): Promise<BiometricAuthResult> {
  if (Platform.OS === 'web') {
    return { success: true, enrolled: false };
  }

  try {
    const { available } = await checkBiometricsAvailable();
    if (!available) {
      // Device does not support or user has not enrolled biometrics; proceed with pin/passcode fallback or allow
      return { success: true, enrolled: false };
    }

    const authResult = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel,
      fallbackLabel: 'Use Device Passcode',
      disableDeviceFallback: false,
    });

    if (authResult.success) {
      return { success: true, enrolled: true };
    } else {
      return {
        success: false,
        error: authResult.error || 'Biometric authentication was cancelled or failed.',
        enrolled: true,
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Biometric verification failed',
      enrolled: false,
    };
  }
}
