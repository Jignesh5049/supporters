import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { AlertCircle, ArrowRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { BrandLogo } from '../components/BrandLogo';
import { colors } from '../styles/theme';
import { ACCOUNT_LIMITS, OtpPurpose, passwordSchema } from '@supporters/shared';
import { toE164Phone, validateName } from '../services/authService';
import { SignUpFormFields, TermsModal, TermsCheckbox } from '../features/auth/components';

const PASSWORD = ACCOUNT_LIMITS.password;

export function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { requestOtp, navigate } = useApp();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  // Error states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    if (nameError) setNameError(null);
    if (errorMessage) setErrorMessage(null);
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (phoneError) setPhoneError(null);
    if (errorMessage) setErrorMessage(null);
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (passwordError) setPasswordError(null);
    if (errorMessage) setErrorMessage(null);
  };

  const handleConfirmPasswordChange = (val: string) => {
    setConfirmPassword(val);
    if (confirmPasswordError) setConfirmPasswordError(null);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setErrorMessage(null);

    let hasError = false;
    const cleanName = name.trim();
    const e164Phone = toE164Phone(phone);

    if (!cleanName) {
      setNameError('Full Name is required');
      hasError = true;
    } else if (!validateName(cleanName)) {
      setNameError('Please enter a valid full name');
      hasError = true;
    }

    if (!phone.trim()) {
      setPhoneError('Mobile number is required');
      hasError = true;
    } else if (!e164Phone) {
      setPhoneError('Enter a 10-digit Indian mobile number');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (!passwordSchema.safeParse(password).success) {
      setPasswordError(`Use ${PASSWORD.min} to ${PASSWORD.max} characters`);
      hasError = true;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      hasError = true;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      hasError = true;
    }

    if (!agreedToTerms) {
      setTermsError('You must accept the Terms and Conditions to proceed');
      hasError = true;
    }

    if (hasError || !e164Phone) {
      return;
    }

    setLoading(true);
    try {
      const result = await requestOtp(OtpPurpose.Signup, e164Phone);
      if (!result.success) {
        setErrorMessage(result.error || 'Something went wrong. Try again.');
      } else {
        navigate('verify_otp', {
          purpose: OtpPurpose.Signup,
          phone: e164Phone,
          name: cleanName,
          password,
          referralCode: referralCode.trim() || undefined,
        });
      }
    } catch {
      setErrorMessage('A network error occurred. Please try again.');
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
          <View style={styles.brandingHeader}>
            <BrandLogo size="lg" showSubtitle={false} />
            <Text style={styles.heading}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started.</Text>
          </View>

          <View style={styles.card}>
            {errorMessage && (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color={colors.danger} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            <SignUpFormFields
              name={name}
              onNameChange={handleNameChange}
              nameError={nameError}
              phone={phone}
              onPhoneChange={handlePhoneChange}
              phoneError={phoneError}
              password={password}
              onPasswordChange={handlePasswordChange}
              passwordError={passwordError}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              confirmPassword={confirmPassword}
              onConfirmPasswordChange={handleConfirmPasswordChange}
              confirmPasswordError={confirmPasswordError}
              showConfirmPassword={showConfirmPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              referralCode={referralCode}
              onReferralCodeChange={setReferralCode}
              loading={loading}
            />

            <TermsCheckbox
              agreed={agreedToTerms}
              onToggle={() => {
                setAgreedToTerms(!agreedToTerms);
                if (termsError) setTermsError(null);
              }}
              onOpenTerms={() => setTermsModalVisible(true)}
              error={termsError}
            />

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.buttonLoadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Sending OTP...</Text>
                </View>
              ) : (
                <View style={styles.buttonContentRow}>
                  <Text style={styles.primaryButtonText}>Sign Up & Verify</Text>
                  <ArrowRight size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigate('sign_in')}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <TermsModal visible={termsModalVisible} onClose={() => setTermsModalVisible(false)} />
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
    marginBottom: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 12,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
});
