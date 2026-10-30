import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';

export function SubscriptionScreen() {
  const { showToast, navigate } = useApp();

  const perks = [
    'Official Blue Shield Verified Vendor Trustmark',
    'Priority top placement in category & city searches',
    'Unlimited product listings with technical specs & brochures',
    'Direct RFQ leads delivered to WhatsApp & In-App Chat',
    'Zero commission on verified deals and direct buyer connections',
    'Dedicated regional account manager for trade matchmaking',
    'Access to premium business analytics and profile visitors',
  ];

  const handleUpgrade = () => {
    showToast('Selected Annual Plan (₹999/year). Redirecting to secure checkout...', 'success');
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Banner */}
      <View style={styles.headerCard}>
        <View style={styles.crownCircle}>
          <MaterialCommunityIcons name="crown" size={30} color="#FFFFFF" />
        </View>

        <View style={styles.planBadgeContainer}>
          <Text style={styles.planBadgeText}>ANNUAL MEMBERSHIP</Text>
        </View>

        <Text style={styles.planTitle}>Supporters Pro Membership</Text>
        <Text style={styles.planSubtitle}>
          Accelerate your commercial growth and reach 50,000+ verified trade buyers across India.
        </Text>

        {/* Pricing Display */}
        <View style={styles.priceContainer}>
          <View style={styles.priceRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <Text style={styles.priceAmount}>999</Text>
            <Text style={styles.pricePeriod}>/ year</Text>
          </View>
          <View style={styles.billedBadge}>
            <Ionicons name="sparkles" size={12} color="#059669" />
            <Text style={styles.billedText}>Special Annual Trade Offer • All-inclusive</Text>
          </View>
        </View>

        {/* Perks List */}
        <View style={styles.perksList}>
          {perks.map((perk, idx) => (
            <View key={idx} style={styles.perkItem}>
              <Ionicons name="checkmark-circle" size={17} color="#10B981" />
              <Text style={styles.perkText}>{perk}</Text>
            </View>
          ))}
        </View>

        {/* Upgrade Action */}
        <TouchableOpacity style={styles.upgradeBtn} onPress={handleUpgrade} activeOpacity={0.85}>
          <Text style={styles.upgradeBtnText}>Upgrade to Pro for ₹999 / year</Text>
          <Feather name="arrow-right" size={16} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.termsNote}>
          Instant GST invoice provided. 1-year validity from activation date.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 12,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    alignItems: 'center',
    marginBottom: 24,
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
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: '900',
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
  priceContainer: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#F8FAFC',
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primary,
  },
  priceAmount: {
    fontSize: 38,
    fontWeight: '900',
    color: colors.primary,
  },
  pricePeriod: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
    marginLeft: 4,
  },
  billedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
  },
  billedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  perksList: {
    width: '100%',
    gap: 10,
    marginBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: 16,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  perkText: {
    fontSize: 12,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 16,
  },
  upgradeBtn: {
    backgroundColor: colors.primary,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  upgradeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  termsNote: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 10,
    textAlign: 'center',
  },
});
