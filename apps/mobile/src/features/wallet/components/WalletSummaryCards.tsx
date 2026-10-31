import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gift, Clock, CheckCircle2 } from 'lucide-react-native';
import { colors } from '../../../styles/theme';

interface WalletSummaryCardsProps {
  totalReferralEarnings: number;
  pendingWithdrawals: number;
  totalWithdrawn: number;
}

export function WalletSummaryCards({
  totalReferralEarnings,
  pendingWithdrawals,
  totalWithdrawn,
}: WalletSummaryCardsProps) {
  return (
    <View style={styles.grid}>
      <View style={styles.card}>
        <View style={[styles.iconDot, { backgroundColor: '#EEF2FF' }]}>
          <Gift size={13} color={colors.primary} />
        </View>
        <Text style={styles.label}>Total Referral</Text>
        <Text style={[styles.value, { color: colors.primary }]}>
          ₹{totalReferralEarnings.toLocaleString('en-IN')}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={[styles.iconDot, { backgroundColor: '#FEF3C7' }]}>
          <Clock size={13} color="#D97706" />
        </View>
        <Text style={styles.label}>Pending</Text>
        <Text style={[styles.value, { color: '#D97706' }]}>
          ₹{pendingWithdrawals.toLocaleString('en-IN')}
        </Text>
      </View>

      <View style={styles.card}>
        <View style={[styles.iconDot, { backgroundColor: '#DCFCE7' }]}>
          <CheckCircle2 size={13} color="#16A34A" />
        </View>
        <Text style={styles.label}>Withdrawn</Text>
        <Text style={[styles.value, { color: '#16A34A' }]}>
          ₹{totalWithdrawn.toLocaleString('en-IN')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  iconDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 2,
    textAlign: 'center',
  },
  value: {
    fontSize: 13,
    fontWeight: '800',
  },
});
