import * as LocalAuthentication from 'expo-local-authentication';
import { checkBiometricsAvailable, authenticateBiometric } from './biometrics';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

describe('biometrics auth helper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkBiometricsAvailable', () => {
    it('returns available true when device has hardware and is enrolled', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([1]);

      const result = await checkBiometricsAvailable();
      expect(result.available).toBe(true);
      expect(result.hasHardware).toBe(true);
      expect(result.isEnrolled).toBe(true);
    });

    it('returns available false when device has no hardware', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([]);

      const result = await checkBiometricsAvailable();
      expect(result.available).toBe(false);
      expect(result.hasHardware).toBe(false);
    });

    it('returns available false when device has hardware but not enrolled', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([1]);

      const result = await checkBiometricsAvailable();
      expect(result.available).toBe(false);
      expect(result.isEnrolled).toBe(false);
    });
  });

  describe('authenticateBiometric', () => {
    it('proceeds successfully if device has no biometrics enrolled', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);

      const result = await authenticateBiometric('Test Auth');
      expect(result.success).toBe(true);
      expect(result.enrolled).toBe(false);
      expect(LocalAuthentication.authenticateAsync).not.toHaveBeenCalled();
    });

    it('returns success true when biometric prompt succeeds', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([1]);
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });

      const result = await authenticateBiometric('Confirm payout');
      expect(result.success).toBe(true);
      expect(result.enrolled).toBe(true);
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
        promptMessage: 'Confirm payout',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Device Passcode',
        disableDeviceFallback: false,
      });
    });

    it('returns success false with error when user cancels prompt', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([1]);
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });

      const result = await authenticateBiometric('Confirm payout');
      expect(result.success).toBe(false);
      expect(result.error).toBe('user_cancel');
      expect(result.enrolled).toBe(true);
    });
  });
});
