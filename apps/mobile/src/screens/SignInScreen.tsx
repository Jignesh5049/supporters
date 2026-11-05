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
  Keyboard,
} from 'react-native';
import { User, Lock, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApp } from '../context/AppContext';
import { BrandLogo } from '../components/BrandLogo';
import { colors } from '../styles/theme';
import { toLoginIdentifier } from '../services/authService';

const loginFormSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Mobile number or email is required')
    .refine(
      (val) => !!toLoginIdentifier(val),
      'Enter a 10-digit mobile number or an email address',
    ),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, navigate, showToast } = useApp();

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
    mode: 'onBlur',
  });

  const onSubmit = async (data: LoginFormValues) => {
    Keyboard.dismiss();
    setErrorMessage(null);

    try {
      const cleanIdentifier = data.identifier.trim();
      const result = await signIn({ identifier: cleanIdentifier, password: data.password });

      if (!result.success) {
        setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
      } else {
        showToast('Welcome back to Supporters!', 'success');
      }
    } catch {
      setErrorMessage('A network error occurred. Please try again.');
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
                <AlertCircle size={16} color={colors.danger} />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            )}

            {/* Mobile Number or Email Input Field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Mobile Number or Email</Text>
              <Controller
                control={control}
                name="identifier"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    style={[
                      styles.inputWrapper,
                      errors.identifier ? styles.inputWrapperError : null,
                    ]}
                  >
                    <User
                      size={16}
                      color={errors.identifier ? colors.danger : '#667085'}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={value}
                      onChangeText={(val) => {
                        onChange(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      onBlur={onBlur}
                      placeholder="98765 43210 or name@business.com"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="email-address"
                      textContentType="username"
                      autoComplete="username"
                      accessibilityLabel="Mobile number or email"
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isSubmitting}
                    />
                  </View>
                )}
              />
              {errors.identifier && (
                <Text style={styles.fieldErrorText} accessibilityRole="alert">
                  {errors.identifier.message}
                </Text>
              )}
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

              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <View
                    style={[styles.inputWrapper, errors.password ? styles.inputWrapperError : null]}
                  >
                    <Lock
                      size={16}
                      color={errors.password ? colors.danger : '#667085'}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={styles.textInput}
                      value={value}
                      onChangeText={(val) => {
                        onChange(val);
                        if (errorMessage) setErrorMessage(null);
                      }}
                      onBlur={onBlur}
                      placeholder="Enter your password"
                      placeholderTextColor="#9CA3AF"
                      secureTextEntry={!showPassword}
                      textContentType="password"
                      autoComplete="current-password"
                      accessibilityLabel="Password"
                      autoCapitalize="none"
                      editable={!isSubmitting}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIconBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff size={18} color="#667085" />
                      ) : (
                        <Eye size={18} color="#667085" />
                      )}
                    </TouchableOpacity>
                  </View>
                )}
              />
              {errors.password && (
                <Text style={styles.fieldErrorText} accessibilityRole="alert">
                  {errors.password.message}
                </Text>
              )}
            </View>

            {/* Primary Sign In Button */}
            <TouchableOpacity
              style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
              onPress={() => handleSubmit(onSubmit)()}
              disabled={isSubmitting}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Sign in"
            >
              {isSubmitting ? (
                <View style={styles.buttonLoadingRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Signing In...</Text>
                </View>
              ) : (
                <View style={styles.buttonContentRow}>
                  <Text style={styles.primaryButtonText}>Sign In</Text>
                  <ArrowRight size={16} color="#FFFFFF" />
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
