import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, Crown, CheckCircle2, Calendar, Sparkles, Info } from 'lucide-react-native';
import { useApp } from '../../src/context/AppContext';
import { colors, typography, spacing, borderRadius } from '../../src/styles/theme';

export default function HubPremiumScreen() {
  const router = useRouter();
  const { currentUser } = useApp();

  const isPremium = false; // Status check
  const expiryDate = '31 Dec 2026';

  const PREMIUM_PERKS = [
    'Unlimited Product & Service Catalog listings (Free limit: 25)',
    'Unlimited B2B Updates & Offers (Free limit: 10 per week)',
    'Priority Featured Placement in local supplier search results',
    '365 Days of Customer Lead & Profile Analytics (Free: 7 days)',
    'Direct Buyer Requirement matching & priority quotes',
    'Gold Crown membership badge displayed on business page',
    'Dedicated B2B account support & export assistance',
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Premium Membership</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Tier Status Card */}
        <View style={styles.statusCard}>
          <View style={styles.crownContainer}>
            <Crown size={32} color="#D97706" />
          </View>

          <Text style={styles.tierName}>
            {isPremium ? 'Supporters Premium Member' : 'Supporters Free Business Tier'}
          </Text>

          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>
              {isPremium ? 'Active Plan' : 'Standard Account'}
            </Text>
          </View>

          {isPremium && (
            <View style={styles.expiryRow}>
              <Calendar size={14} color={colors.textSecondary} style={{ marginRight: 4 }} />
              <Text style={styles.expiryText}>Expires on {expiryDate}</Text>
            </View>
          )}
        </View>

        {/* Perks List */}
        <View style={styles.perksSection}>
          <View style={styles.perksHeadingRow}>
            <Sparkles size={18} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.perksHeading}>Premium Member Privileges</Text>
          </View>

          <View style={styles.perkItems}>
            {PREMIUM_PERKS.map((perk, index) => (
              <View key={index} style={styles.perkRow}>
                <CheckCircle2
                  size={18}
                  color={colors.success}
                  style={{ marginRight: 10, marginTop: 2 }}
                />
                <Text style={styles.perkText}>{perk}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* App Store Compliance Notice (No buy button or checkout links) */}
        <View style={styles.noticeBox}>
          <Info size={18} color={colors.textSecondary} style={{ marginRight: 8, marginTop: 2 }} />
          <Text style={styles.noticeText}>
            Supporters business membership subscriptions are activated and billed through your
            Supporters Web Dashboard at supporters.app. Mobile app purchases are not supported.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 60,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  crownContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  tierName: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  statusPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginTop: 4,
    marginBottom: spacing.xs,
  },
  statusPillText: {
    ...typography.caption,
    fontWeight: '700',
    color: colors.primary,
  },
  expiryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  expiryText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  perksSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.gray200,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  perksHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
    paddingBottom: spacing.sm,
  },
  perksHeading: {
    ...typography.subtitle1,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  perkItems: {
    gap: spacing.md,
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  perkText: {
    ...typography.body2,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 20,
    fontWeight: '500',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  noticeText: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});
