import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Share
} from 'react-native';
import { Feather, FontAwesome, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';

export function ReferralScreen() {
  const { referralData, showToast, navigate } = useApp();

  const handleCopyCode = () => {
    showToast(`Referral code ${referralData.code} copied!`, 'success');
  };

  const handleShareWhatsApp = async () => {
    try {
      await Share.share({
        message: `Join Supporters, India's leading B2B marketplace! Use my invite code ${referralData.code} to get verified vendor benefits: https://supporters.in/ref/${referralData.code}`,
      });
    } catch {
      // Ignored
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Banner */}
      <View style={styles.bannerCard}>
        <View style={styles.bannerTop}>
          <View style={styles.giftIconCircle}>
            <Feather name="gift" size={24} color="#FFFFFF" />
          </View>
          <View style={styles.rewardTag}>
            <Text style={styles.rewardTagText}>₹250 / Verified Business</Text>
          </View>
        </View>

        <Text style={styles.bannerTitle}>Invite Indian Manufacturers & Trade Partners</Text>
        <Text style={styles.bannerDesc}>
          Expand your regional supply chain. Whenever a referred seller or contractor registers and verifies their catalog, ₹250 is instantly credited to your Supporters Wallet.
        </Text>

        {/* Code Box */}
        <View style={styles.codeContainer}>
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>YOUR INVITE CODE</Text>
            <Text style={styles.codeText}>{referralData.code}</Text>
          </View>

          <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCode}>
            <Feather name="copy" size={14} color={colors.primary} />
            <Text style={styles.copyBtnText}>Copy</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Share on WhatsApp */}
        <TouchableOpacity
          style={styles.whatsAppBtn}
          onPress={handleShareWhatsApp}
          activeOpacity={0.85}
        >
          <FontAwesome name="whatsapp" size={18} color="#FFFFFF" />
          <Text style={styles.whatsAppBtnText}>Share Invite on WhatsApp</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{referralData.totalReferrals}</Text>
          <Text style={styles.statLabel}>Invited</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>
            {referralData.successful}
          </Text>
          <Text style={styles.statLabel}>Verified</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: colors.accentMagenta }]}>
            ₹{referralData.rewardsEarned.toLocaleString('en-IN')}
          </Text>
          <Text style={styles.statLabel}>Total Earned</Text>
        </View>
      </View>

      {/* Reward History */}
      <View style={styles.historySection}>
        <Text style={styles.historyHeading}>Referral Payout Activity</Text>

        <View style={styles.historyList}>
          {referralData.history.map((item) => (
            <View key={item.id} style={styles.historyItem}>
              <View style={styles.historyIconBox}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
              </View>

              <View style={styles.historyDetails}>
                <Text style={styles.historyBizName}>{item.businessName}</Text>
                <Text style={styles.historyCityDate}>
                  {item.city} · {item.date}
                </Text>
              </View>

              <View style={styles.rewardCol}>
                <Text style={styles.rewardAmount}>+₹{item.rewardAmount}</Text>
                <Text style={styles.rewardStatus}>{item.status}</Text>
              </View>
            </View>
          ))}
        </View>
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
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(163,35,142,0.25)',
    padding: 16,
    marginBottom: 12,
  },
  bannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  giftIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accentMagenta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardTag: {
    backgroundColor: colors.accentMagentaLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(163,35,142,0.3)',
  },
  rewardTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.accentMagenta,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  bannerDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 17,
    marginTop: 6,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    marginTop: 14,
    gap: 10,
  },
  codeBox: {
    flex: 1,
  },
  codeLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#667085',
  },
  codeText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.accentMagenta,
    letterSpacing: 1,
    marginTop: 2,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  whatsAppBtn: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    borderRadius: 12,
    gap: 8,
    marginTop: 10,
  },
  whatsAppBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  historySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 20,
  },
  historyHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 10,
  },
  historyList: {
    gap: 10,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  historyIconBox: {
    marginRight: 10,
  },
  historyDetails: {
    flex: 1,
  },
  historyBizName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  historyCityDate: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  rewardCol: {
    alignItems: 'flex-end',
  },
  rewardAmount: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  rewardStatus: {
    fontSize: 9,
    color: colors.textSecondary,
    marginTop: 1,
  },
});
