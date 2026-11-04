import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Crown, CheckCircle2, Sparkles, ShieldCheck } from 'lucide-react-native';
import { useMyBusiness } from '../features/business/hooks';
import { colors, spacing, borderRadius } from '../styles/theme';

export function SubscriptionScreen() {
  const { data: business } = useMyBusiness();
  const isVerified = business?.isVerified ?? false;

  const perks = [
    'Official Blue Shield Verified Vendor Trustmark',
    'Priority top placement in category & city searches',
    'Unlimited product listings with technical specs & brochures',
    'Direct RFQ leads delivered to WhatsApp & In-App Chat',
    'Zero commission on verified deals and direct buyer connections',
    'Dedicated regional account manager for trade matchmaking',
    'Access to premium business analytics and profile visitors',
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Banner */}
      <View style={styles.headerCard}>
        <View style={styles.crownCircle}>
          <Crown size={28} color="#FFFFFF" />
        </View>

        <View style={styles.planBadgeContainer}>
          <Text style={styles.planBadgeText}>MEMBERSHIP STATUS</Text>
        </View>

        <Text style={styles.planTitle}>Supporters Pro Benefits</Text>
        <Text style={styles.planSubtitle}>
          Commercial growth and verification suite for trade vendors and manufacturers across India.
        </Text>

        {/* Current Membership Status Display */}
        <View style={styles.statusContainer}>
          <View style={styles.statusRow}>
            <ShieldCheck size={18} color={isVerified ? colors.primary : colors.textSecondary} />
            <Text style={styles.statusLabel}>Account Status:</Text>
            <Text style={[styles.statusValue, isVerified && styles.statusValueActive]}>
              {isVerified ? 'Verified Pro Vendor' : 'Community Member'}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <Sparkles size={13} color="#059669" />
            <Text style={styles.statusBadgeText}>
              {isVerified
                ? 'All business features & directory trustmarks active'
                : 'Compliant with Google Play & App Store policies'}
            </Text>
          </View>
        </View>

        {/* Perks List */}
        <View style={styles.perksList}>
          {perks.map((perk, idx) => (
            <View key={idx} style={styles.perkItem}>
              <CheckCircle2 size={16} color="#10B981" />
              <Text style={styles.perkText}>{perk}</Text>
            </View>
          ))}
        </View>

        <View style={styles.complianceBox}>
          <Text style={styles.complianceText}>
            Supporters Pro memberships are managed via official partner onboarding. Subscriptions
            are not sold inside this application.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  crownCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  planBadgeContainer: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  planSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: colors.surface,
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  statusValueActive: {
    color: colors.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginTop: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  perksList: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  perkText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    flex: 1,
  },
  complianceBox: {
    width: '100%',
    padding: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  complianceText: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
});
