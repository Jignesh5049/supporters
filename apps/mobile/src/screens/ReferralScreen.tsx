import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Share,
  Platform
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import {
  REFERRAL_REWARD_CONFIG,
  calculateReferralEarnings,
  getReferralMilestoneStatus,
} from '../services/referralService';

export function ReferralScreen() {
  const { referralData, showToast, navigate } = useApp();
  const [copiedCode, setCopiedCode] = useState(false);

  // Calculate milestones based on successful referrals
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
        <TouchableOpacity onPress={() => navigate('home')} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Referral & Earn</Text>
        <TouchableOpacity
          onPress={() => navigate('wallet')}
          style={styles.walletHeaderBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="wallet-outline" size={16} color={colors.primary} />
          <Text style={styles.walletHeaderBtnText}>Wallet</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadgeRow}>
            <View style={styles.programBadge}>
              <MaterialCommunityIcons name="gift-outline" size={14} color="#FFFFFF" />
              <Text style={styles.programBadgeText}>Supporters Partner Rewards</Text>
            </View>
            <View style={styles.maxCapBadge}>
              <Text style={styles.maxCapBadgeText}>Max ₹500 / Account</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Invite Businesses & Earn Up To ₹500</Text>
          <Text style={styles.heroSubtitle}>
            Grow your commercial network. You receive ₹300 for your 1st referred business and ₹200 for your 2nd referred business credited to your in-app wallet.
          </Text>

          {/* Referral Code Box */}
          <View style={styles.codeCard}>
            <View style={styles.codeTextCol}>
              <Text style={styles.codeLabel}>YOUR EXCLUSIVE REFERRAL CODE</Text>
              <Text style={styles.codeValue}>{referralData.code}</Text>
            </View>
            <TouchableOpacity
              style={styles.copyButton}
              onPress={handleCopyCode}
              activeOpacity={0.8}
            >
              <Feather name={copiedCode ? 'check' : 'copy'} size={14} color="#FFFFFF" />
              <Text style={styles.copyButtonText}>{copiedCode ? 'Copied' : 'Copy'}</Text>
            </TouchableOpacity>
          </View>

          {/* Share Actions */}
          <TouchableOpacity
            style={styles.shareBtn}
            onPress={handleShareLink}
            activeOpacity={0.85}
          >
            <Feather name="share-2" size={16} color="#FFFFFF" />
            <Text style={styles.shareBtnText}>Share Referral Link</Text>
          </TouchableOpacity>
        </View>

        {/* Milestone Progress Card */}
        <View style={styles.milestoneCard}>
          <View style={styles.milestoneHeader}>
            <View>
              <Text style={styles.cardHeading}>Referral Milestones</Text>
              <Text style={styles.cardSubheading}>
                {successfulCount >= 2
                  ? 'All ₹500 rewards unlocked!'
                  : successfulCount === 1
                  ? '1 of 2 rewards claimed (₹300 earned)'
                  : 'Claim up to ₹500 in 2 simple referrals'}
              </Text>
            </View>
            <View style={styles.totalEarnedTag}>
              <Text style={styles.totalEarnedTagLabel}>Total Earned</Text>
              <Text style={styles.totalEarnedTagValue}>₹{milestone.totalEarned}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: successfulCount === 0 ? '0%' : successfulCount === 1 ? '50%' : '100%' },
              ]}
            />
          </View>

          {/* Milestone 1 & 2 Cards */}
          <View style={styles.milestonesRow}>
            {/* Milestone 1 */}
            <View
              style={[
                styles.stepCard,
                milestone.milestone1Completed && styles.stepCardCompleted,
              ]}
            >
              <View style={styles.stepHeader}>
                <View
                  style={[
                    styles.stepBadge,
                    milestone.milestone1Completed && styles.stepBadgeCompleted,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepBadgeText,
                      milestone.milestone1Completed && styles.stepBadgeTextCompleted,
                    ]}
                  >
                    1st Referral
                  </Text>
                </View>
                {milestone.milestone1Completed && (
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                )}
              </View>
              <Text style={styles.stepAmount}>₹300</Text>
              <Text style={styles.stepDesc}>
                {milestone.milestone1Completed ? 'Credited to Wallet' : 'On first verified partner'}
              </Text>
            </View>

            {/* Milestone 2 */}
            <View
              style={[
                styles.stepCard,
                milestone.milestone2Completed && styles.stepCardCompleted,
              ]}
            >
              <View style={styles.stepHeader}>
                <View
                  style={[
                    styles.stepBadge,
                    milestone.milestone2Completed && styles.stepBadgeCompleted,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepBadgeText,
                      milestone.milestone2Completed && styles.stepBadgeTextCompleted,
                    ]}
                  >
                    2nd Referral
                  </Text>
                </View>
                {milestone.milestone2Completed && (
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                )}
              </View>
              <Text style={styles.stepAmount}>₹200</Text>
              <Text style={styles.stepDesc}>
                {milestone.milestone2Completed ? 'Credited to Wallet' : 'On second verified partner'}
              </Text>
            </View>
          </View>

          {/* Rules Banner (3rd onward is ₹0, Max ₹500) */}
          <View style={styles.policyNotice}>
            <Ionicons name="information-circle" size={16} color="#475569" style={{ marginTop: 1 }} />
            <Text style={styles.policyNoticeText}>
              <Text style={{ fontWeight: '700' }}>Reward Rules: </Text>
              First referral = ₹300. Second referral = ₹200. Third and subsequent referrals = ₹0 reward. Maximum referral reward is capped at ₹500 per user. Pending & ineligible referrals do not count.
            </Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{referralData.totalReferrals}</Text>
            <Text style={styles.statLabel}>Total Invited</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#10B981' }]}>{successfulCount}</Text>
            <Text style={styles.statLabel}>Successful</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>₹{milestone.totalEarned}</Text>
            <Text style={styles.statLabel}>Wallet Earned</Text>
          </View>
        </View>

        {/* Wallet Callout Banner */}
        <View style={styles.walletBanner}>
          <View style={styles.walletBannerLeft}>
            <View style={styles.walletIconCircle}>
              <Ionicons name="wallet" size={18} color="#FFFFFF" />
            </View>
            <View style={styles.walletTextCol}>
              <Text style={styles.walletBannerTitle}>App Wallet Balance</Text>
              <Text style={styles.walletBannerSub} numberOfLines={2}>
                Referral credits appear in your wallet for withdrawal
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.walletBannerAction}
            onPress={() => navigate('wallet')}
            activeOpacity={0.8}
          >
            <Text style={styles.walletBannerActionText}>View Wallet</Text>
            <Feather name="arrow-right" size={13} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Referral History Section */}
        <View style={styles.historySection}>
          <View style={styles.historyHeaderRow}>
            <Text style={styles.historyTitle}>Referral History</Text>
            <Text style={styles.historyCount}>{referralData.history.length} records</Text>
          </View>

          <View style={styles.historyList}>
            {referralData.history.map((item) => {
              const isSuccess = item.status === 'Successful';
              const isPending = item.status === 'Pending';
              const isIneligible = item.status === 'Ineligible' || item.status === 'Failed';

              return (
                <View key={item.id} style={styles.historyItem}>
                  {/* Status Indicator Icon */}
                  <View
                    style={[
                      styles.historyStatusCircle,
                      isSuccess && { backgroundColor: '#DCFCE7' },
                      isPending && { backgroundColor: '#FEF3C7' },
                      isIneligible && { backgroundColor: '#F1F5F9' },
                    ]}
                  >
                    {isSuccess && <Ionicons name="checkmark" size={14} color="#16A34A" />}
                    {isPending && <Ionicons name="time-outline" size={14} color="#D97706" />}
                    {isIneligible && <Feather name="alert-circle" size={14} color="#64748B" />}
                  </View>

                  <View style={styles.historyInfo}>
                    <Text style={styles.historyName}>{item.businessName}</Text>
                    <Text style={styles.historySub}>
                      {item.city} · {item.date}
                    </Text>
                    {item.notes && (
                      <Text style={styles.historyNote}>{item.notes}</Text>
                    )}
                  </View>

                  {/* Reward & Status Badge */}
                  <View style={styles.historyRewardCol}>
                    <Text
                      style={[
                        styles.historyRewardAmount,
                        item.rewardAmount > 0 ? { color: '#16A34A' } : { color: '#64748B' },
                      ]}
                    >
                      {item.rewardAmount > 0 ? `+₹${item.rewardAmount}` : '₹0'}
                    </Text>
                    <View
                      style={[
                        styles.statusPill,
                        isSuccess && styles.statusPillSuccess,
                        isPending && styles.statusPillPending,
                        isIneligible && styles.statusPillIneligible,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isSuccess && styles.statusPillTextSuccess,
                          isPending && styles.statusPillTextPending,
                          isIneligible && styles.statusPillTextIneligible,
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 40 }} />
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
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
  },
  topBarTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  walletHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  walletHeaderBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  container: {
    flex: 1,
    padding: 14,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(163, 35, 142, 0.25)',
    padding: 16,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#A3238E',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  programBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accentMagenta,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  programBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  maxCapBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  maxCapBadgeText: {
    color: '#7E22CE',
    fontSize: 10,
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
    lineHeight: 23,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  codeTextCol: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  codeValue: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.accentMagenta,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.accentMagenta,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  copyButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
  },
  shareBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  milestoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  cardSubheading: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  totalEarnedTag: {
    alignItems: 'flex-end',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  totalEarnedTagLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6366F1',
    textTransform: 'uppercase',
  },
  totalEarnedTagValue: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.primary,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  milestonesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  stepCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
  },
  stepCardCompleted: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stepBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stepBadgeCompleted: {
    backgroundColor: '#DCFCE7',
  },
  stepBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#475569',
  },
  stepBadgeTextCompleted: {
    color: '#15803D',
  },
  stepAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  stepDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  policyNotice: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    padding: 10,
    borderRadius: 10,
    gap: 8,
  },
  policyNoticeText: {
    fontSize: 10.5,
    color: '#475569',
    lineHeight: 15,
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: 2,
  },
  walletBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    gap: 10,
  },
  walletBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  walletIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  walletTextCol: {
    flex: 1,
    minWidth: 0,
  },
  walletBannerTitle: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
  },
  walletBannerSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10.5,
    lineHeight: 14,
    marginTop: 2,
  },
  walletBannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexShrink: 0,
  },
  walletBannerActionText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  historySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  historyHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  historyCount: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  historyList: {
    gap: 10,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 10,
  },
  historyStatusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  historyInfo: {
    flex: 1,
  },
  historyName: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  historySub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  historyNote: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 2,
    fontStyle: 'italic',
  },
  historyRewardCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  historyRewardAmount: {
    fontSize: 13,
    fontWeight: '900',
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  statusPillSuccess: {
    backgroundColor: '#DCFCE7',
  },
  statusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPillIneligible: {
    backgroundColor: '#F1F5F9',
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusPillTextSuccess: {
    color: '#16A34A',
  },
  statusPillTextPending: {
    color: '#D97706',
  },
  statusPillTextIneligible: {
    color: '#64748B',
  },
});
