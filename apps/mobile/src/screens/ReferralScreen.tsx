import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Share } from 'react-native';
import { ArrowLeft, Wallet } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import { getReferralMilestoneStatus } from '../services/referralService';
import {
  ReferralHeroCard,
  ReferralMilestonesCard,
  ReferralStatsGrid,
  ReferralWalletBanner,
  ReferralHistoryList,
} from '../features/referral/components';

export function ReferralScreen() {
  const { referralData, showToast, navigate } = useApp();
  const [copiedCode, setCopiedCode] = useState(false);

  const successfulCount = referralData.history.filter((h) => h.status === 'Successful').length;
  const milestone = getReferralMilestoneStatus(successfulCount);

  const handleCopyCode = () => {
    showToast(`Referral code ${referralData.code} copied!`, 'success');
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareLink = async () => {
    try {
      await Share.share({
        message: `Join Supporters, India's verified B2B marketplace! Use my invite code ${referralData.code} to get verified supplier status and commercial perks: https://supporters.in/register?ref=${referralData.code}`,
      });
    } catch {
      // Ignored
    }
  };

  return (
    <View style={styles.screenWrapper}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigate('home')}
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Referral & Earn</Text>
        <TouchableOpacity
          onPress={() => navigate('wallet')}
          style={styles.walletHeaderBtn}
          activeOpacity={0.8}
        >
          <Wallet size={16} color={colors.primary} />
          <Text style={styles.walletHeaderBtnText}>Wallet</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <ReferralHeroCard
          referralCode={referralData.code}
          copiedCode={copiedCode}
          onCopyCode={handleCopyCode}
          onShareLink={handleShareLink}
        />

        <ReferralMilestonesCard successfulCount={successfulCount} milestone={milestone} />

        <ReferralStatsGrid
          totalReferrals={referralData.totalReferrals}
          successfulCount={successfulCount}
          totalEarned={milestone.totalEarned}
        />

        <ReferralWalletBanner onNavigateWallet={() => navigate('wallet')} />

        <ReferralHistoryList history={referralData.history} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 6,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  walletHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EEF0FA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  walletHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  container: {
    flex: 1,
  },
});
