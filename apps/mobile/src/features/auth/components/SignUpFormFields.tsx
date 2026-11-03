import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { User, Phone, Lock, Tag, Eye, EyeOff } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import { ACCOUNT_LIMITS } from '@supporters/shared';

const PASSWORD = ACCOUNT_LIMITS.password;

interface SignUpFormFieldsProps {
  name: string;
  onNameChange: (v: string) => void;
  nameError?: string | null;
  phone: string;
  onPhoneChange: (v: string) => void;
  phoneError?: string | null;
  password: string;
  onPasswordChange: (v: string) => void;
  passwordError?: string | null;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  confirmPassword: string;
  onConfirmPasswordChange: (v: string) => void;
  confirmPasswordError?: string | null;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (v: boolean) => void;
  referralCode: string;
  onReferralCodeChange: (v: string) => void;
  loading: boolean;
}

export function SignUpFormFields({
  name,
  onNameChange,
  nameError,
  phone,
  onPhoneChange,
  phoneError,
  password,
  onPasswordChange,
  passwordError,
  showPassword,
  setShowPassword,
  confirmPassword,
  onConfirmPasswordChange,
  confirmPasswordError,
  showConfirmPassword,
  setShowConfirmPassword,
  referralCode,
  onReferralCodeChange,
  loading,
}: SignUpFormFieldsProps) {
  return (
    <>
      {/* Full Name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Full Name / Proprietor Name</Text>
        <View style={[styles.inputWrapper, nameError ? styles.inputWrapperError : null]}>
          <User size={16} color={nameError ? colors.danger : '#667085'} />
          <TextInput
            style={styles.textInput}
            value={name}
            onChangeText={onNameChange}
            placeholder="e.g. Ramesh Patel"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="words"
            editable={!loading}
          />
        </View>
        {nameError && <Text style={styles.fieldErrorText}>{nameError}</Text>}
      </View>

      {/* Mobile Number */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Mobile Number (+91)</Text>
        <View style={[styles.inputWrapper, phoneError ? styles.inputWrapperError : null]}>
          <Phone size={16} color={phoneError ? colors.danger : '#667085'} />
          <TextInput
            style={styles.textInput}
            value={phone}
            onChangeText={onPhoneChange}
            placeholder="98765 43210"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel-national"
            accessibilityLabel="Mobile number"
            autoCorrect={false}
            editable={!loading}
          />
        </View>
        {phoneError && <Text style={styles.fieldErrorText}>{phoneError}</Text>}
      </View>

      {/* Password */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Password</Text>
        <View style={[styles.inputWrapper, passwordError ? styles.inputWrapperError : null]}>
          <Lock size={16} color={passwordError ? colors.danger : '#667085'} />
          <TextInput
            style={styles.textInput}
            value={password}
            onChangeText={onPasswordChange}
            placeholder={`At least ${PASSWORD.min} characters`}
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            autoComplete="new-password"
            accessibilityLabel="Password"
            autoCapitalize="none"
            editable={!loading}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {showPassword ? (
              <EyeOff size={18} color="#667085" />
            ) : (
              <Eye size={18} color="#667085" />
            )}
          </TouchableOpacity>
        </View>
        {passwordError && <Text style={styles.fieldErrorText}>{passwordError}</Text>}
      </View>

      {/* Confirm Password */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Confirm Password</Text>
        <View style={[styles.inputWrapper, confirmPasswordError ? styles.inputWrapperError : null]}>
          <Lock size={16} color={confirmPasswordError ? colors.danger : '#667085'} />
          <TextInput
            style={styles.textInput}
            value={confirmPassword}
            onChangeText={onConfirmPasswordChange}
            placeholder="Re-enter password"
            placeholderTextColor="#9CA3AF"
            secureTextEntry={!showConfirmPassword}
            textContentType="newPassword"
            autoComplete="new-password"
            accessibilityLabel="Confirm password"
            autoCapitalize="none"
            editable={!loading}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {showConfirmPassword ? (
              <EyeOff size={18} color="#667085" />
            ) : (
              <Eye size={18} color="#667085" />
            )}
          </TouchableOpacity>
        </View>
        {confirmPasswordError && <Text style={styles.fieldErrorText}>{confirmPasswordError}</Text>}
      </View>

      {/* Referral Code */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Referral Code (Optional)</Text>
        <View style={styles.inputWrapper}>
          <Tag size={16} color="#667085" />
          <TextInput
            style={styles.textInput}
            value={referralCode}
            onChangeText={onReferralCodeChange}
            placeholder="e.g. SUP-XXXX"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            editable={!loading}
          />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    height: 44,
    gap: 8,
  },
  inputWrapperError: {
    borderColor: colors.danger,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
  },
  fieldErrorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '500',
  },
});
