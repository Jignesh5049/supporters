import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../context/AppContext';
import { colors } from '../../styles/theme';
import { ACCOUNT_LIMITS, OtpPurpose, passwordSchema } from '@supporters/shared';
import { toE164Phone } from '../../services/authService';
import { ApiErrorCode } from '../../lib/api';
import { type VerifiedReset, useAuthFlowStore } from '../../stores/auth-flow-store';

export function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { requestOtp, resetPassword, navigate, showToast } = useApp();
  const setPendingOtp = useAuthFlowStore((state) => state.setPendingOtp);
  const setVerifiedReset = useAuthFlowStore((state) => state.setVerifiedReset);

  // Step 1 asks for the phone and sends a code; the OTP screen returns here with both.
  const verified: Partial<VerifiedReset> = useAuthFlowStore((state) => state.verifiedReset) ?? {};
  const isPasswordStep = Boolean(verified.phone && verified.otp);

  const [value, setValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isCodeRejected, setIsCodeRejected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

  // "Request a new code" returns to step 1 on this same screen: start it clean.
  useEffect(() => {
    setValue('');
    setFieldError(null);
    setIsCodeRejected(false);
  }, [isPasswordStep]);

  const handleValueChange = (val: string) => {
    setValue(val);
    if (fieldError) setFieldError(null);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSendCode = async () => {
    const phone = toE164Phone(value);
    if (!phone) {
      setFieldError('Enter your 10-digit mobile number');
      return;
    }
    const result = await requestOtp(OtpPurpose.Reset, phone);
    if (!result.success) {
      setErrorMessage(result.error ?? 'Something went wrong. Try again.');
      return;
    }
    setPendingOtp({ purpose: OtpPurpose.Reset, phone });
    navigate('verify_otp');
  };

  const handleResetPassword = async () => {
    if (!passwordSchema.safeParse(value).success) {
      const { min, max } = ACCOUNT_LIMITS.password;
      setFieldError(`Use ${min} to ${max} characters`);
      return;
    }
    const result = await resetPassword({
      phone: verified.phone ?? '',
      otp: verified.otp ?? '',
      newPassword: value,
    });
    if (result.success) {
      setSubmitted(true);
      showToast('Password updated. Sign in with your new password.', 'success');
      return;
    }
    setIsCodeRejected(
      result.code === ApiErrorCode.OtpInvalid || result.code === ApiErrorCode.OtpAttemptsExceeded,
    );
    setErrorMessage(result.error ?? 'Something went wrong. Try again.');
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setErrorMessage(null);
    setLoading(true);
    try {
      await (isPasswordStep ? handleResetPassword() : handleSendCode());
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.keyboardContainer}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.innerContainer}>
          {/* Header Lock Icon */}
          <View style={styles.brandingHeader}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed" size={26} color={colors.primary} />
            </View>
            <Text style={styles.heading}>Reset Password</Text>
            <Text style={styles.subtitle}>
              {isPasswordStep
                ? 'Choose a new password for your account.'
                : 'Enter your registered mobile number and we will send you a code by SMS.'}
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {submitted ? (
              <View style={styles.successContainer}>
                <View style={styles.successIconCircle}>
                  <Ionicons name="checkmark-circle" size={28} color={colors.primary} />
                </View>
                <Text style={styles.successTitle}>Password Updated</Text>
                <Text style={styles.successMessage}>
                  Your password has been changed and other devices were signed out. Sign in with
                  your new password.
                </Text>

                <TouchableOpacity
                  style={[styles.primaryButton, { marginTop: 16 }]}
                  onPress={() => navigate('sign_in')}
                >
                  <Text style={styles.primaryButtonText}>Return to Sign In</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    {isPasswordStep ? 'New Password' : 'Mobile Number (+91)'}
                  </Text>
                  <View style={[styles.inputWrapper, fieldError ? styles.inputWrapperError : null]}>
                    <Feather
                      name={isPasswordStep ? 'lock' : 'phone'}
                      size={16}
                      color={fieldError ? colors.danger : '#667085'}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={value}
                      onChangeText={handleValueChange}
                      placeholder={isPasswordStep ? 'Enter a new password' : '98765 43210'}
                      placeholderTextColor="#9CA3AF"
                      keyboardType={isPasswordStep ? 'default' : 'phone-pad'}
                      secureTextEntry={isPasswordStep && !showPassword}
                      textContentType={isPasswordStep ? 'newPassword' : 'telephoneNumber'}
                      autoComplete={isPasswordStep ? 'new-password' : 'tel-national'}
                      accessibilityLabel={isPasswordStep ? 'New password' : 'Mobile number'}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!loading}
                    />
                    {isPasswordStep && (
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <Feather
                          name={showPassword ? 'eye-off' : 'eye'}
                          size={18}
                          color="#667085"
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                  {fieldError && <Text style={styles.fieldErrorText}>{fieldError}</Text>}
                  {isCodeRejected && (
                    <TouchableOpacity
                      onPress={() => setVerifiedReset(null)}
                      accessibilityRole="button"
                    >
                      <Text style={styles.fieldErrorText}>Request a new code</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.primaryButton, loading && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <View style={styles.buttonLoadingRow}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.primaryButtonText}>
                        {isPasswordStep ? 'Saving...' : 'Sending Code...'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContentRow}>
                      <Text style={styles.primaryButtonText}>
                        {isPasswordStep ? 'Save Password' : 'Send Code'}
                      </Text>
                      <Feather name="arrow-right" size={16} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Footer Back Button */}
          <View style={styles.footerRow}>
            <TouchableOpacity onPress={() => navigate('sign_in')} style={styles.backToSignInBtn}>
              <Feather name="arrow-left" size={16} color={colors.textSecondary} />
              <Text style={styles.footerText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerContainer: {
    width: '100%',
    maxWidth: 440,
  },
  brandingHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heading: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '600',
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
  },
  inputWrapperError: {
    borderColor: colors.danger,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  fieldErrorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  buttonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  successMessage: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  backToSignInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
