import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle2, Info } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import type { ReferralMilestoneStatus } from '../../../services/referralService';

interface ReferralMilestonesCardProps {
  successfulCount: number;
  milestone: ReferralMilestoneStatus;
}

export function ReferralMilestonesCard({
  successfulCount,
  milestone,
}: ReferralMilestonesCardProps) {
  const getSubheading = () => {
    if (successfulCount >= 2) return 'All ₹500 rewards unlocked!';
    if (successfulCount === 1) return '1 of 2 rewards claimed (₹300 earned)';
    return 'Claim up to ₹500 in 2 simple referrals';
  };

  const getProgressWidth = () => {
    if (successfulCount === 0) return '0%';
    if (successfulCount === 1) return '50%';
    return '100%';
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerTextCol}>
          <Text style={styles.heading}>Referral Milestones</Text>
          <Text style={styles.subheading}>{getSubheading()}</Text>
        </View>
        <View style={styles.totalEarnedTag}>
          <Text style={styles.totalEarnedLabel}>Total Earned</Text>
          <Text style={styles.totalEarnedValue}>₹{milestone.totalEarned}</Text>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: getProgressWidth() }]} />
      </View>

      {/* Milestones Row */}
      <View style={styles.milestonesRow}>
        {/* Milestone 1 */}
        <View style={[styles.stepCard, milestone.milestone1Completed && styles.stepCardCompleted]}>
          <View style={styles.stepHeader}>
            <View
              style={[styles.stepBadge, milestone.milestone1Completed && styles.stepBadgeCompleted]}
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
              <CheckCircle2 size={16} color="#10B981" fill="#DCFCE7" />
            )}
          </View>
          <Text style={styles.stepAmount}>₹300</Text>
          <Text style={styles.stepDesc}>
            {milestone.milestone1Completed ? 'Credited to Wallet' : 'On first verified partner'}
          </Text>
        </View>

        {/* Milestone 2 */}
        <View style={[styles.stepCard, milestone.milestone2Completed && styles.stepCardCompleted]}>
          <View style={styles.stepHeader}>
            <View
              style={[styles.stepBadge, milestone.milestone2Completed && styles.stepBadgeCompleted]}
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
              <CheckCircle2 size={16} color="#10B981" fill="#DCFCE7" />
            )}
          </View>
          <Text style={styles.stepAmount}>₹200</Text>
          <Text style={styles.stepDesc}>
            {milestone.milestone2Completed ? 'Credited to Wallet' : 'On second verified partner'}
          </Text>
        </View>
      </View>

      {/* Policy Notice */}
      <View style={styles.policyNotice}>
        <Info size={16} color="#475569" style={styles.infoIcon} />
        <Text style={styles.policyNoticeText}>
          <Text style={styles.bold}>Reward Rules: </Text>
          First referral = ₹300. Second referral = ₹200. Third and subsequent referrals = ₹0 reward.
          Maximum referral reward is capped at ₹500 per user. Pending & ineligible referrals do not
          count.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  heading: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subheading: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  totalEarnedTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  totalEarnedLabel: {
    fontSize: 9,
    color: '#065F46',
    fontWeight: '600',
  },
  totalEarnedValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#059669',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  milestonesRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  stepCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  stepBadgeTextCompleted: {
    color: '#15803D',
  },
  stepAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  stepDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 14,
  },
  policyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  infoIcon: {
    marginTop: 1,
  },
  policyNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
  },
  bold: {
    fontWeight: '700',
  },
});
