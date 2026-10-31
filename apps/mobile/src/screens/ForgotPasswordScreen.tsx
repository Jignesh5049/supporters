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
  Keyboard,
} from 'react-native';
import { Lock, Phone, Eye, EyeOff, ArrowLeft, AlertCircle, ArrowRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import { ACCOUNT_LIMITS, OtpPurpose, passwordSchema } from '@supporters/shared';
import { toE164Phone } from '../services/authService';
import { ApiErrorCode } from '../lib/api';
import { PasswordResetSuccess } from '../features/auth/components/PasswordResetSuccess';

export function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { requestOtp, resetPassword, navigate, routeParams, showToast } = useApp();

  // Step 1 asks for the phone and sends a code; the OTP screen returns here with both.
  const verified = routeParams as { phone?: string; otp?: string };
  const isPasswordStep = Boolean(verified.phone && verified.otp);

  const [value, setValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isCodeRejected, setIsCodeRejected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);

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
    navigate('verify_otp', { purpose: OtpPurpose.Reset, phone });
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
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.innerContainer}>
          {/* Header Lock Icon */}
          <View style={styles.brandingHeader}>
            <View style={styles.iconCircle}>
              <Lock size={26} color={colors.primary} />
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
                <AlertCircle size={16} color={colors.danger} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {submitted ? (
              <PasswordResetSuccess onReturnToSignIn={() => navigate('sign_in')} />
            ) : (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    {isPasswordStep ? 'New Password' : 'Mobile Number (+91)'}
                  </Text>
                  <View style={[styles.inputWrapper, fieldError ? styles.inputWrapperError : null]}>
                    {isPasswordStep ? (
                      <Lock size={16} color={fieldError ? colors.danger : '#667085'} />
                    ) : (
                      <Phone size={16} color={fieldError ? colors.danger : '#667085'} />
                    )}
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
                        {showPassword ? (
                          <EyeOff size={18} color="#667085" />
                        ) : (
                          <Eye size={18} color="#667085" />
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                  {fieldError && <Text style={styles.fieldErrorText}>{fieldError}</Text>}
                  {isCodeRejected && (
                    <TouchableOpacity
                      onPress={() => navigate('forgot_password', {})}
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
                      <ArrowRight size={16} color="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Back to Sign In Link */}
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigate('sign_in')}
            activeOpacity={0.7}
          >
            <ArrowLeft size={16} color={colors.primary} />
            <Text style={styles.backLinkText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  innerContainer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  brandingHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EEF0FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 8,
  },
  errorBannerText: {
    fontSize: 12,
    color: colors.danger,
    flex: 1,
  },
  fieldGroup: {
    marginBottom: 16,
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    height: 46,
    gap: 8,
  },
  inputWrapperError: {
    borderColor: colors.danger,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
  },
  fieldErrorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '500',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
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
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  backLinkText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
});
