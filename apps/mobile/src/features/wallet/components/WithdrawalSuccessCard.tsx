import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Check, ArrowRight } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../../styles/theme';

interface WithdrawalSuccessCardProps {
  amount: number;
  referenceId: string;
  onReturnToWallet: () => void;
  onViewHistory: () => void;
}

export function WithdrawalSuccessCard({
  amount,
  referenceId,
  onReturnToWallet,
  onViewHistory,
}: WithdrawalSuccessCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.successIconCircle}>
        <Check size={36} color="#FFFFFF" />
      </View>

      <Text style={styles.successTitle}>Withdrawal Request Submitted</Text>
      <Text style={styles.successAmount}>₹{amount.toLocaleString('en-IN')}</Text>

      <Text style={styles.successSubtitle}>
        Your withdrawal request has been scheduled for automated processing. It is marked as{' '}
        <Text style={{ fontWeight: '800', color: '#D97706' }}>Pending</Text> in your payout history
        and reserved from available balance.
      </Text>

      <View style={styles.refBox}>
        <Text style={styles.refBoxLabel}>REQUEST TRACKING ID</Text>
        <Text style={styles.refBoxValue}>{referenceId}</Text>
      </View>

      <TouchableOpacity style={styles.doneBtn} onPress={onReturnToWallet} activeOpacity={0.85}>
        <Text style={styles.doneBtnText}>Return to Wallet Dashboard</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.trackBtn} onPress={onViewHistory} activeOpacity={0.7}>
        <Text style={styles.trackBtnText}>View In Payout Requests ↗</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    margin: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  successAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: colors.primary,
    marginVertical: 10,
  },
  successSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  refBox: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  refBoxLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.5,
  },
  refBoxValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  doneBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginBottom: 10,
  },
  doneBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  trackBtn: {
    paddingVertical: 8,
  },
  trackBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
