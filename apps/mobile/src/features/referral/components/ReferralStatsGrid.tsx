import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../../styles/theme';

interface ReferralStatsGridProps {
  totalReferrals: number;
  successfulCount: number;
  totalEarned: number;
}

export function ReferralStatsGrid({
  totalReferrals,
  successfulCount,
  totalEarned,
}: ReferralStatsGridProps) {
  return (
    <View style={styles.statsGrid}>
      <View style={styles.statBox}>
        <Text style={styles.statNumber}>{totalReferrals}</Text>
        <Text style={styles.statLabel}>Total Invited</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={[styles.statNumber, { color: '#10B981' }]}>{successfulCount}</Text>
        <Text style={styles.statLabel}>Successful</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={[styles.statNumber, { color: colors.primary }]}>₹{totalEarned}</Text>
        <Text style={styles.statLabel}>Wallet Earned</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
