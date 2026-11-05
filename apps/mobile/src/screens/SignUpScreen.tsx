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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApp } from '../context/AppContext';
import { BrandLogo } from '../components/BrandLogo';
import { colors } from '../styles/theme';
import { ACCOUNT_LIMITS, OtpPurpose, passwordSchema } from '@supporters/shared';
import { toE164Phone, validateName } from '../services/authService';
import { SignUpFormFields, TermsModal, TermsCheckbox } from '../features/auth/components';

const PASSWORD = ACCOUNT_LIMITS.password;

const signUpFormSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Full Name is required')
      .refine(validateName, 'Please enter a valid full name'),
    phone: z
      .string()
      .trim()
      .min(1, 'Mobile number is required')
      .refine((val) => !!toE164Phone(val), 'Enter a 10-digit Indian mobile number'),
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    referralCode: z.string().optional(),
    agreedToTerms: z
      .boolean()
      .refine((val) => val === true, 'You must accept the Terms and Conditions to proceed'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignUpFormValues = z.infer<typeof signUpFormSchema>;

export function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { requestOtp, navigate } = useApp();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    watch,
    setValue,
    handleSubmit,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      name: '',
      phone: '',
      password: '',
      confirmPassword: '',
      referralCode: '',
      agreedToTerms: false as any,
    },
    mode: 'onBlur',
  });

  const formValues = watch();

  const onSubmit = async (data: SignUpFormValues) => {
    Keyboard.dismiss();
    setErrorMessage(null);

    const cleanName = data.name.trim();
    const e164Phone = toE164Phone(data.phone);

    if (!e164Phone) {
      return;
    }

    try {
      const result = await requestOtp(OtpPurpose.Signup, e164Phone);
      if (!result.success) {
        setErrorMessage(result.error || 'Something went wrong. Try again.');
      } else {
        navigate('verify_otp', {
          purpose: OtpPurpose.Signup,
          phone: e164Phone,
          name: cleanName,
          password: data.password,
          referralCode: data.referralCode?.trim() || undefined,
        });
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
              name={formValues.name}
              onNameChange={(val) => {
                setValue('name', val);
                clearErrors('name');
                if (errorMessage) setErrorMessage(null);
              }}
              nameError={errors.name?.message}
              phone={formValues.phone}
              onPhoneChange={(val) => {
                setValue('phone', val);
                clearErrors('phone');
                if (errorMessage) setErrorMessage(null);
              }}
              phoneError={errors.phone?.message}
              password={formValues.password}
              onPasswordChange={(val) => {
                setValue('password', val);
                clearErrors('password');
                if (errorMessage) setErrorMessage(null);
              }}
              passwordError={errors.password?.message}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              confirmPassword={formValues.confirmPassword}
              onConfirmPasswordChange={(val) => {
                setValue('confirmPassword', val);
                clearErrors('confirmPassword');
                if (errorMessage) setErrorMessage(null);
              }}
              confirmPasswordError={errors.confirmPassword?.message}
              showConfirmPassword={showConfirmPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              referralCode={formValues.referralCode || ''}
              onReferralCodeChange={(val) => setValue('referralCode', val)}
              loading={isSubmitting}
            />

            <TermsCheckbox
              agreed={formValues.agreedToTerms === true}
              onToggle={() => {
                setValue('agreedToTerms', !formValues.agreedToTerms as any, {
                  shouldValidate: true,
                });
                if (errorMessage) setErrorMessage(null);
              }}
              onOpenTerms={() => setTermsModalVisible(true)}
              error={errors.agreedToTerms?.message}
            />

            <TouchableOpacity
              style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
              onPress={() => handleSubmit(onSubmit)()}
              disabled={isSubmitting}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Proceed to OTP Verification"
            >
              {isSubmitting ? (
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
