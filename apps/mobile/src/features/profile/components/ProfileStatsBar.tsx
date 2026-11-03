import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Briefcase, CreditCard, Crown, ChevronRight } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../../styles/theme';

interface ProfileStatsBarProps {
  followingCount: number;
  businessesCount: number;
  businessId?: string;
  onOpenFollowing: () => void;
  onOpenStorefront: () => void;
  onOpenHub: () => void;
  onOpenWallet: () => void;
  onOpenPro: () => void;
}

export function ProfileStatsBar({
  followingCount,
  businessesCount,
  onOpenFollowing,
  onOpenStorefront,
  onOpenHub,
  onOpenWallet,
  onOpenPro,
}: ProfileStatsBarProps) {
  return (
    <View style={styles.container}>
      {/* Stats Counter Row */}
      <View style={styles.statsCard}>
        <TouchableOpacity style={styles.statItem} onPress={onOpenFollowing} activeOpacity={0.75}>
          <Text style={[styles.statNumber, { color: colors.primary }]}>{followingCount}</Text>
          <Text style={[styles.statLabel, { color: colors.primary, fontWeight: '700' }]}>
            Following ↗
          </Text>
        </TouchableOpacity>

        <View style={styles.statDivider} />

        <TouchableOpacity style={styles.statItem} onPress={onOpenStorefront} activeOpacity={0.75}>
          <Text style={styles.statNumber}>{businessesCount}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Storefront ↗</Text>
        </TouchableOpacity>
      </View>

      {/* Growth Shortcuts */}
      <View style={styles.shortcutsRow}>
        <TouchableOpacity style={styles.shortcutCard} onPress={onOpenHub} activeOpacity={0.8}>
          <Briefcase size={16} color={colors.primary} />
          <Text style={styles.shortcutTitle}>My Business Hub</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shortcutCard, { borderColor: '#A7F3D0' }]}
          onPress={onOpenWallet}
          activeOpacity={0.8}
        >
          <CreditCard size={16} color="#059669" />
          <Text style={[styles.shortcutTitle, { color: '#059669' }]}>App Wallet</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.shortcutCard, { borderColor: 'rgba(163,35,142,0.3)' }]}
          onPress={onOpenPro}
          activeOpacity={0.8}
        >
          <Crown size={16} color="#F59E0B" />
          <Text style={styles.shortcutTitle}>Pro</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: colors.border,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  shortcutCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
  },
  shortcutTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});
