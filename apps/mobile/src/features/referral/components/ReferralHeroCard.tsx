import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Gift, Check, Copy, Share2 } from 'lucide-react-native';
import { colors } from '../../../styles/theme';

interface ReferralHeroCardProps {
  referralCode: string;
  copiedCode: boolean;
  onCopyCode: () => void;
  onShareLink: () => void;
}

export function ReferralHeroCard({
  referralCode,
  copiedCode,
  onCopyCode,
  onShareLink,
}: ReferralHeroCardProps) {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroBadgeRow}>
        <View style={styles.programBadge}>
          <Gift size={14} color="#FFFFFF" />
          <Text style={styles.programBadgeText}>Supporters Partner Rewards</Text>
        </View>
        <View style={styles.maxCapBadge}>
          <Text style={styles.maxCapBadgeText}>Max ₹500 / Account</Text>
        </View>
      </View>

      <Text style={styles.heroTitle}>Invite Businesses & Earn Up To ₹500</Text>
      <Text style={styles.heroSubtitle}>
        Grow your commercial network. You receive ₹300 for your 1st referred business and ₹200 for
        your 2nd referred business credited to your in-app wallet.
      </Text>

      {/* Referral Code Box */}
      <View style={styles.codeCard}>
        <View style={styles.codeTextCol}>
          <Text style={styles.codeLabel}>YOUR EXCLUSIVE REFERRAL CODE</Text>
          <Text style={styles.codeValue}>{referralCode}</Text>
        </View>
        <TouchableOpacity style={styles.copyButton} onPress={onCopyCode} activeOpacity={0.8}>
          {copiedCode ? <Check size={14} color="#FFFFFF" /> : <Copy size={14} color="#FFFFFF" />}
          <Text style={styles.copyButtonText}>{copiedCode ? 'Copied' : 'Copy'}</Text>
        </TouchableOpacity>
      </View>

      {/* Share Actions */}
      <TouchableOpacity style={styles.shareBtn} onPress={onShareLink} activeOpacity={0.85}>
        <Share2 size={16} color="#FFFFFF" />
        <Text style={styles.shareBtnText}>Share Referral Link</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  programBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  programBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  maxCapBadge: {
    backgroundColor: '#FEF08A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  maxCapBadgeText: {
    color: '#854D0E',
    fontSize: 11,
    fontWeight: '700',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#E0E7FF',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  codeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 14,
  },
  codeTextCol: {
    flex: 1,
  },
  codeLabel: {
    color: '#C7D2FE',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  codeValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accentCyan,
    paddingHorizontal: 12,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 12,
  },
  shareBtnText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
