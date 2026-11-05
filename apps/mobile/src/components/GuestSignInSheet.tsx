import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LogIn, UserPlus, X, ShieldCheck } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '../styles/theme';
import { useApp } from '../context/AppContext';

interface GuestSignInSheetProps {
  visible: boolean;
  onClose: () => void;
  actionTitle?: string;
  onSuccessContinuation?: () => void;
}

export function GuestSignInSheet({
  visible,
  onClose,
  actionTitle = 'continue',
  onSuccessContinuation,
}: GuestSignInSheetProps) {
  const router = useRouter();
  const { navigate } = useApp();

  if (!visible) return null;

  const handleSignIn = () => {
    onClose();
    navigate('sign_in');
    router.push('/(auth)/sign-in');
  };

  const handleSignUp = () => {
    onClose();
    navigate('sign_up');
    router.push('/(auth)/sign-up');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.sheetContent}>
          <View style={styles.dragIndicator} />

          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <ShieldCheck size={24} color={colors.primary} />
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sheetTitle}>Sign In to {actionTitle}</Text>
          <Text style={styles.sheetSubtitle}>
            Join thousands of manufacturers, traders, and buyers across India to unlock direct
            quotes, messaging, following suppliers, and bookmarking.
          </Text>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.signInButton}
              onPress={handleSignIn}
              activeOpacity={0.85}
            >
              <LogIn size={18} color="#FFFFFF" />
              <Text style={styles.signInButtonText}>Sign In to Existing Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signUpButton}
              onPress={handleSignUp}
              activeOpacity={0.85}
            >
              <UserPlus size={18} color={colors.primary} />
              <Text style={styles.signUpButtonText}>Create New Account (Free)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  dragIndicator: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  sheetTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sheetSubtitle: {
    ...typography.body2,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  actionButtons: {
    gap: spacing.sm,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    gap: 8,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  signUpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 13,
    borderRadius: borderRadius.md,
    gap: 8,
  },
  signUpButtonText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
});
