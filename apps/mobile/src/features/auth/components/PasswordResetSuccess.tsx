import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { colors } from '../../../styles/theme';

interface PasswordResetSuccessProps {
  onReturnToSignIn: () => void;
}

export function PasswordResetSuccess({ onReturnToSignIn }: PasswordResetSuccessProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <CheckCircle2 size={32} color={colors.primary} />
      </View>
      <Text style={styles.title}>Password Updated</Text>
      <Text style={styles.message}>
        Your password has been changed and other devices were signed out. Sign in with your new
        password.
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={onReturnToSignIn}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryButtonText}>Return to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EEF0FA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  primaryButton: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
