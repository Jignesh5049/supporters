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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { BrandLogo } from '../components/BrandLogo';
import { colors } from '../styles/theme';
import { toLoginIdentifier } from '../services/authService';

export function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, navigate, showToast } = useApp();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleIdentifierChange = (val: string) => {
    setIdentifier(val);
    if (identifierError) setIdentifierError(null);
    if (errorMessage) setErrorMessage(null);
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (passwordError) setPasswordError(null);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    setErrorMessage(null);

    let hasValidationError = false;
    const cleanIdentifier = identifier.trim();

    if (!cleanIdentifier) {
      setIdentifierError('Mobile number or email is required');
      hasValidationError = true;
    } else if (!toLoginIdentifier(cleanIdentifier)) {
      setIdentifierError('Enter a 10-digit mobile number or an email address');
      hasValidationError = true;
    }

    if (!password) {
      setPasswordError('Password is required');
      hasValidationError = true;
    }

    if (hasValidationError) {
      return;
    }

    setLoading(true);
    try {
      const result = await signIn({ identifier: cleanIdentifier, password });

      if (!result.success) {
        setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
      } else {
        showToast('Welcome back to Supporters!', 'success');
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
          {/* Logo & Platform Emblem */}
          <View style={styles.brandingHeader}>
            <BrandLogo size="lg" showSubtitle={false} />
            <Text style={styles.heading}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue where you left off.</Text>
          </View>

          {/* Card Form */}
          <View style={styles.card}>
            {/* Error Banner */}
            {errorMessage && (
              <View style={styles.errorBanner}>
                <Feather name="alert-circle" size={16} color={colors.danger} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {/* Mobile Number or Email Input Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mobile Number or Email</Text>
              <View
                style={[styles.inputWrapper, identifierError ? styles.inputWrapperError : null]}
              >
                <Feather
                  name="user"
                  size={16}
                  color={identifierError ? colors.danger : '#667085'}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.textInput}
                  value={identifier}
                  onChangeText={handleIdentifierChange}
                  placeholder="98765 43210 or name@business.com"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  textContentType="username"
                  autoComplete="username"
                  accessibilityLabel="Mobile number or email"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
              </View>
              {identifierError && <Text style={styles.fieldErrorText}>{identifierError}</Text>}
            </View>

            {/* Password Input Field */}
            <View style={styles.fieldGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.fieldLabel}>Password</Text>
                <TouchableOpacity
                  onPress={() => navigate('forgot_password')}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
              </View>

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
                  placeholder="Enter your password"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  autoComplete="current-password"
                  accessibilityLabel="Password"
                  autoCapitalize="none"
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIconBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#667085" />
                </TouchableOpacity>
              </View>
              {passwordError && <Text style={styles.fieldErrorText}>{passwordError}</Text>}
            </View>

            {/* Primary Sign In Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.buttonLoadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Signing In...</Text>
                </View>
              ) : (
                <View style={styles.buttonContentRow}>
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                  <Feather name="arrow-right" size={16} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer Navigation */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigate('sign_up')}>
              <Text style={styles.footerLinkText}>Sign Up</Text>
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
  heading: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 12,
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
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  forgotPasswordText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.accentCyan,
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
});
