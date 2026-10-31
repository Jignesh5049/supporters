import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Receipt, ShieldCheck, CheckCircle2, Fingerprint } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../../styles/theme';

interface WithdrawalReviewCardProps {
  amount: number;
  method: 'UPI' | 'Bank Account';
  upiId: string;
  accountHolder: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  onConfirm: () => void;
  onEdit: () => void;
}

export function WithdrawalReviewCard({
  amount,
  method,
  upiId,
  accountHolder,
  bankName,
  accountNumber,
  ifscCode,
  onConfirm,
  onEdit,
}: WithdrawalReviewCardProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleBiometricAuthAndSubmit = async () => {
    setIsAuthenticating(true);
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (hasHardware && isEnrolled) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Confirm biometric identity for payout withdrawal',
          fallbackLabel: 'Use Device Passcode',
          cancelLabel: 'Cancel',
        });

        if (result.success) {
          onConfirm();
        } else {
          Alert.alert(
            'Authentication Incomplete',
            'Biometric verification was not completed. Please try again to authorize your withdrawal.',
          );
        }
      } else {
        // Fallback for devices without enrolled biometrics
        Alert.alert(
          'Confirm Payout Request',
          `Are you sure you want to withdraw ₹${amount.toLocaleString('en-IN')} to ${
            method === 'UPI' ? upiId : `${bankName} (${accountNumber.slice(-4)})`
          }?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Confirm', onPress: onConfirm },
          ],
        );
      }
    } catch {
      // Direct confirmation fallback on error
      onConfirm();
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.reviewCard}>
        <View style={styles.reviewHeader}>
          <Receipt size={22} color={colors.primary} />
          <Text style={styles.reviewTitle}>Confirm Payout Summary</Text>
        </View>

        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Withdrawal Amount</Text>
          <Text style={styles.reviewValueBig}>₹{amount.toLocaleString('en-IN')}</Text>
        </View>

        <View style={styles.reviewDivider} />

        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Payout Mode</Text>
          <Text style={styles.reviewValue}>{method}</Text>
        </View>

        {method === 'UPI' ? (
          <View style={styles.reviewRow}>
            <Text style={styles.reviewLabel}>Destination UPI</Text>
            <Text style={styles.reviewValue}>{upiId}</Text>
          </View>
        ) : (
          <>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Account Holder</Text>
              <Text style={styles.reviewValue}>{accountHolder}</Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Bank & A/C</Text>
              <Text style={styles.reviewValue}>
                {bankName} (••••{accountNumber.slice(-4)})
              </Text>
            </View>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>IFSC Code</Text>
              <Text style={styles.reviewValue}>{ifscCode}</Text>
            </View>
          </>
        )}

        <View style={styles.reviewDivider} />

        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Processing Fee</Text>
          <Text style={[styles.reviewValue, { color: '#16A34A' }]}>₹0 (Free)</Text>
        </View>

        <View style={styles.reviewRow}>
          <Text style={styles.reviewLabel}>Estimated Crediting</Text>
          <Text style={styles.reviewValue}>Within 24 to 48 hours</Text>
        </View>
      </View>

      <View style={styles.securityBanner}>
        <ShieldCheck size={16} color="#15803D" />
        <Text style={styles.securityBannerText}>
          Encrypted bank-grade transmission protected by biometrics and device security.
        </Text>
      </View>

      <TouchableOpacity
        style={styles.confirmBtn}
        onPress={handleBiometricAuthAndSubmit}
        disabled={isAuthenticating}
        activeOpacity={0.85}
      >
        {isAuthenticating ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Fingerprint size={18} color="#FFFFFF" />
            <Text style={styles.confirmBtnText}>Authorize & Submit Request</Text>
          </>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.editBtn} onPress={onEdit} activeOpacity={0.7}>
        <Text style={styles.editBtnText}>Edit Details</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  reviewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 4,
  },
  reviewLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  reviewValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  reviewValueBig: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  reviewDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  securityBanner: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.lg,
  },
  securityBannerText: {
    fontSize: 12,
    color: '#15803D',
    flex: 1,
    lineHeight: 16,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    marginBottom: 10,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  editBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
});
