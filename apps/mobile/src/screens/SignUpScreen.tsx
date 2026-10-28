import React, { useState } from 'react';
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
  Modal,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { BrandLogo } from '../components/BrandLogo';
import { colors } from '../styles/theme';
import { validateEmail, validatePassword } from '../services/authService';

export function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { signUp, navigate, showToast } = useApp();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('SUPPORT123');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  // Error states
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    if (nameError) setNameError(null);
    if (errorMessage) setErrorMessage(null);
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (emailError) setEmailError(null);
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

  const handleTermsToggle = () => {
    setAgreedToTerms(!agreedToTerms);
    if (termsError) setTermsError(null);
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setErrorMessage(null);

    let hasError = false;
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName) {
      setNameError('Full Name is required');
      hasError = true;
    } else if (cleanName.length < 2) {
      setNameError('Please enter a valid full name');
      hasError = true;
    }

    if (!cleanEmail) {
      setEmailError('Email address is required');
      hasError = true;
    } else if (!validateEmail(cleanEmail)) {
      setEmailError('Please enter a valid business email address');
      hasError = true;
    }

    const passwordValidation = validatePassword(password);
    if (!password) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.message || 'Password must be at least 6 characters');
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

    if (hasError) {
      return;
    }

    setLoading(true);
    try {
      const result = await signUp({
        name: cleanName,
        email: cleanEmail,
        password,
        referralCode: referralCode.trim() || undefined,
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Registration failed. Please check details.');
      } else {
        showToast('Account created successfully! Welcome to Supporters.', 'success');
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.innerContainer}>
          {/* Branding Header */}
          <View style={styles.brandingHeader}>
            <BrandLogo size="lg" showSubtitle={false} />
            <Text style={styles.heading}>Create Account</Text>
            <Text style={styles.subtitle}>Sign up to get started.</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Global Error Banner */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {/* Full Name */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full Name / Proprietor Name</Text>
              <View style={[styles.inputWrapper, nameError ? styles.inputWrapperError : null]}>
                <Feather
                  name="user"
                  size={16}
                  color={nameError ? colors.danger : '#667085'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={name}
                  onChangeText={handleNameChange}
                  placeholder="e.g. Ramesh Patel"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
              {nameError && <Text style={styles.fieldErrorText}>{nameError}</Text>}
            </View>

            {/* Email Address */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Business Email</Text>
              <View style={[styles.inputWrapper, emailError ? styles.inputWrapperError : null]}>
                <Feather
                  name="mail"
                  size={16}
                  color={emailError ? colors.danger : '#667085'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={handleEmailChange}
                  placeholder="name@business.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
              {emailError && <Text style={styles.fieldErrorText}>{emailError}</Text>}
            </View>

            {/* Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <View style={[styles.inputWrapper, passwordError ? styles.inputWrapperError : null]}>
                <Feather
                  name="lock"
                  size={16}
                  color={passwordError ? colors.danger : '#667085'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={handlePasswordChange}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#667085" />
                </TouchableOpacity>
              </View>
              {passwordError && <Text style={styles.fieldErrorText}>{passwordError}</Text>}
            </View>

            {/* Confirm Password */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Confirm Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  confirmPasswordError ? styles.inputWrapperError : null,
                ]}
              >
                <Feather
                  name="lock"
                  size={16}
                  color={confirmPasswordError ? colors.danger : '#667085'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  placeholder="Re-enter password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showConfirmPassword}
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeIconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Feather
                    name={showConfirmPassword ? 'eye-off' : 'eye'}
                    size={18}
                    color="#667085"
                  />
                </TouchableOpacity>
              </View>
              {confirmPasswordError && (
                <Text style={styles.fieldErrorText}>{confirmPasswordError}</Text>
              )}
            </View>

            {/* Referral Code (Optional) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Referral Code (Optional)</Text>
              <View style={styles.inputWrapper}>
                <Feather
                  name="gift"
                  size={16}
                  color={colors.accentMagenta}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={referralCode}
                  onChangeText={(val) => setReferralCode(val.toUpperCase())}
                  placeholder="SUPPORT123"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="characters"
                  editable={!loading}
                />
              </View>
              {referralCode === 'SUPPORT123' && (
                <Text style={styles.referralHint}>
                  ✓ Partner referral code applied (₹250 Welcome bonus eligible)
                </Text>
              )}
            </View>

            {/* Terms and Conditions Checkbox */}
            <View style={styles.termsRow}>
              <TouchableOpacity
                onPress={handleTermsToggle}
                style={[
                  styles.checkbox,
                  agreedToTerms && styles.checkboxActive,
                  termsError ? styles.checkboxError : null,
                ]}
                activeOpacity={0.8}
              >
                {agreedToTerms && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
              </TouchableOpacity>
              <View style={styles.termsTextCol}>
                <Text style={styles.termsText}>
                  I agree to Supporters'{' '}
                  <Text style={styles.termsLink} onPress={() => setTermsModalVisible(true)}>
                    Terms & Conditions
                  </Text>{' '}
                  and Privacy Policy.
                </Text>
              </View>
            </View>
            {termsError && <Text style={styles.fieldErrorText}>{termsError}</Text>}

            {/* Primary Submit Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled, { marginTop: 16 }]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.buttonLoadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Creating Account...</Text>
                </View>
              ) : (
                <View style={styles.buttonContentRow}>
                  <Text style={styles.primaryButtonText}>Create Account</Text>
                  <Feather name="arrow-right" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Back to Sign In */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigate('sign_in')}>
              <Text style={styles.footerLinkText}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Terms & Conditions Modal */}
      <Modal
        visible={termsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTermsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms & Conditions</Text>
              <TouchableOpacity
                onPress={() => setTermsModalVisible(false)}
                style={styles.closeModalBtn}
              >
                <Feather name="x" size={20} color="#667085" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSectionHeader}>1. Acceptance of Terms</Text>
              <Text style={styles.modalParagraph}>
                By creating an account on Supporters, you agree to comply with and be bound by these
                Terms of Service. Supporters facilitates B2B social commerce and verified business
                connections.
              </Text>
              <Text style={styles.modalSectionHeader}>2. Business Verification</Text>
              <Text style={styles.modalParagraph}>
                You represent that all information provided regarding your business name, GSTIN (if
                applicable), and contact details is accurate and genuine.
              </Text>
              <Text style={styles.modalSectionHeader}>3. Commercial Inquiries & Quotes</Text>
              <Text style={styles.modalParagraph}>
                All direct RFQs, chat communications, and quotations submitted through Supporters
                are subject to fair trade ethics and prompt vendor response standards.
              </Text>
              <Text style={styles.modalSectionHeader}>4. Privacy & Data Security</Text>
              <Text style={styles.modalParagraph}>
                We protect your commercial catalog data and personal information in accordance with
                industry encryption and strict privacy protocols.
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalAcceptBtn}
              onPress={() => {
                setAgreedToTerms(true);
                setTermsError(null);
                setTermsModalVisible(false);
              }}
            >
              <Text style={styles.modalAcceptBtnText}>I Agree & Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    marginBottom: 20,
  },
  heading: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 10,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
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
    marginBottom: 14,
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
  eyeIconBtn: {
    padding: 4,
  },
  fieldErrorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '500',
  },
  referralHint: {
    fontSize: 11,
    color: colors.accentMagenta,
    marginTop: 4,
    fontWeight: '600',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 6,
    gap: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxError: {
    borderColor: colors.danger,
  },
  termsTextCol: {
    flex: 1,
  },
  termsText: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  termsLink: {
    color: colors.accentCyan,
    fontWeight: '700',
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  footerText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  footerLinkText: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  // Terms Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  closeModalBtn: {
    padding: 4,
  },
  modalScroll: {
    marginVertical: 12,
  },
  modalSectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 10,
    marginBottom: 4,
  },
  modalParagraph: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  modalAcceptBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAcceptBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
