import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CheckCircle2, Crown, Info } from 'lucide-react-native';
import { messageForError } from '../../lib/api';
import { borderRadius, colors, spacing, typography } from '../../styles/theme';
import { MANAGE_ON_WEB, PERK_LABELS, premiumCopy } from './premium-copy';
import { usePremiumStatus } from './usePremiumStatus';

/**
 * Premium status, expiry and perks. Shared by the hub screen and the prototype subscription screen.
 * No buy button, no price and no checkout link (product spec, decision 10).
 */
export function PremiumStatusView() {
  const { data: status, isPending, isError, error, refetch } = usePremiumStatus();

  if (isPending) {
    return (
      <View style={styles.center} accessibilityRole="progressbar">
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (isError) {
    return (
      <View style={styles.card}>
        <Text style={styles.detail} accessibilityRole="alert">
          {messageForError(error)}
        </Text>
        <TouchableOpacity onPress={() => refetch()} accessibilityRole="button">
          <Text style={styles.retry}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const copy = premiumCopy(status);
  return (
    <View>
      <View style={styles.card}>
        <View style={styles.crown}>
          <Crown size={32} color="#D97706" />
        </View>
        <Text style={styles.title}>{copy.title}</Text>
        <View style={[styles.pill, copy.tone === 'warning' && styles.pillWarning]}>
          <Text style={styles.pillText}>{copy.pill}</Text>
        </View>
        <Text style={styles.detail}>{copy.detail}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.heading}>Premium perks</Text>
        {status.perks.map((perk) => (
          <View key={perk} style={styles.perkRow}>
            <CheckCircle2 size={18} color={colors.success} style={styles.perkIcon} />
            <Text style={styles.perkText}>{PERK_LABELS[perk]}</Text>
          </View>
        ))}
      </View>

      <View style={styles.notice}>
        <Info size={18} color={colors.textSecondary} style={styles.perkIcon} />
        <Text style={styles.noticeText}>{MANAGE_ON_WEB}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { padding: spacing.xl, alignItems: 'center' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  crown: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { ...typography.h3, color: colors.textPrimary, textAlign: 'center' },
  pill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
  },
  pillWarning: { backgroundColor: '#FEF3C7' },
  pillText: { ...typography.caption, fontWeight: '700', color: colors.primary },
  detail: {
    ...typography.body2,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retry: { ...typography.body2, color: colors.primary, fontWeight: '700', marginTop: spacing.sm },
  heading: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
    alignSelf: 'flex-start',
    marginBottom: spacing.md,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    marginBottom: 10,
  },
  perkIcon: { marginRight: 10, marginTop: 2 },
  perkText: { ...typography.body2, color: colors.textPrimary, flex: 1, lineHeight: 20 },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  noticeText: { ...typography.caption, color: colors.textSecondary, flex: 1, lineHeight: 18 },
});
