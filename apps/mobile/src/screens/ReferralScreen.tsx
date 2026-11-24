import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, Gift, Share2, Wallet } from 'lucide-react-native';
import { REFERRAL, type Referral } from '@supporters/shared';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import { useScreenSecurity } from '../hooks/useScreenSecurity';
import { useReferrals } from '../features/wallet/hooks';
import {
  REFERRAL_REASON_LABELS,
  REFERRAL_STATUS_LABELS,
  formatRupees,
} from '../features/wallet/format';
import { messageForError } from '../lib/api';

const INVITE_ORIGIN = 'https://supporters.in';

/** Referral and earn: my code, what it earned, and each referral with the reason for its status. */
export function ReferralScreen() {
  useScreenSecurity();
  const { navigate } = useApp();
  const query = useReferrals();

  const first = query.data?.pages[0];
  const referrals = query.data?.pages.flatMap((page) => page.data) ?? [];

  const handleShare = async () => {
    if (!first) return;
    try {
      await Share.share({
        message: `Join me on Supporters, the business network. Use my invite code ${first.code}: ${INVITE_ORIGIN}/register?ref=${first.code}`,
      });
    } catch {
      // The user closed the share sheet.
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigate('home')}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">
          Refer and earn
        </Text>
        <TouchableOpacity
          onPress={() => navigate('wallet')}
          style={styles.walletBtn}
          accessibilityRole="button"
          accessibilityLabel="Open wallet"
        >
          <Wallet size={16} color={colors.primary} />
          <Text style={styles.walletBtnText}>Wallet</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {query.isPending && (
          <ActivityIndicator color={colors.primary} accessibilityLabel="Loading" />
        )}
        {query.isError && (
          <Text style={styles.error} accessibilityRole="alert">
            {messageForError(query.error)}
          </Text>
        )}
        {first && (
          <>
            <View style={styles.codeCard}>
              <View style={styles.codeHeader}>
                <Gift size={16} color={colors.primary} />
                <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
              </View>
              <Text
                style={styles.code}
                selectable
                accessibilityLabel={`Your code is ${first.code.split('').join(' ')}`}
              >
                {first.code}
              </Text>
              <TouchableOpacity
                onPress={() => void handleShare()}
                style={styles.shareBtn}
                accessibilityRole="button"
                accessibilityLabel="Share your invite"
              >
                <Share2 size={16} color={colors.textWhite} />
                <Text style={styles.shareBtnText}>Share invite</Text>
              </TouchableOpacity>
              <Text style={styles.note}>
                Your friend enters the code when they sign up. It cannot be added later.
              </Text>
            </View>

            <View style={styles.row}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>First referral</Text>
                <Text style={styles.statValue}>{formatRupees(REFERRAL.rewardsPaise[0])}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Second referral</Text>
                <Text style={styles.statValue}>{formatRupees(REFERRAL.rewardsPaise[1])}</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>You earned</Text>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {formatRupees(first.stats.totalEarned.amountPaise)}
                </Text>
              </View>
            </View>
            <Text style={styles.note}>
              A referral is successful when your friend&apos;s business buys Premium and{' '}
              {REFERRAL.pendingDays} days pass without a refund.{' '}
              {first.stats.remainingToCap.amountPaise > 0
                ? `${formatRupees(first.stats.remainingToCap.amountPaise)} left of your ${formatRupees(REFERRAL.lifetimeCapPaise)} limit.`
                : `You reached the ${formatRupees(REFERRAL.lifetimeCapPaise)} limit.`}
            </Text>

            <Text style={styles.sectionTitle} accessibilityRole="header">
              Your referrals ({first.stats.successful} successful, {first.stats.pending} pending)
            </Text>
            {referrals.length === 0 ? (
              <Text style={styles.empty}>
                No referrals yet. Share your code and each friend who signs up appears here.
              </Text>
            ) : (
              referrals.map((referral) => <ReferralRow key={referral.id} referral={referral} />)
            )}
            {query.hasNextPage && (
              <TouchableOpacity
                onPress={() => void query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
                style={styles.moreBtn}
                accessibilityRole="button"
              >
                <Text style={styles.moreBtnText}>
                  {query.isFetchingNextPage ? 'Loading...' : 'Load more'}
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function ReferralRow({ referral }: { referral: Referral }) {
  const rewardPaise = referral.reward?.amountPaise ?? 0;
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${referral.referredName}, ${REFERRAL_STATUS_LABELS[referral.status]}. ${REFERRAL_REASON_LABELS[referral.reason]}`}
    >
      <View style={styles.cardMain}>
        <Text style={styles.cardTitle}>{referral.referredName}</Text>
        <Text style={styles.cardSub}>{REFERRAL_REASON_LABELS[referral.reason]}</Text>
      </View>
      <View style={styles.cardSide}>
        <Text style={[styles.badge, referral.status === 'ineligible' && styles.badgeBad]}>
          {REFERRAL_STATUS_LABELS[referral.status]}
        </Text>
        {rewardPaise > 0 && <Text style={styles.reward}>+{formatRupees(rewardPaise)}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBtn: { padding: 10, minWidth: 44, minHeight: 44, justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  walletBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  walletBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  error: { color: colors.danger, fontSize: 13 },
  codeCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  codeHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  codeLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary },
  code: { fontSize: 30, fontWeight: '900', letterSpacing: 4, color: colors.textPrimary },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  shareBtnText: { color: colors.textWhite, fontWeight: '700', fontSize: 14 },
  note: { fontSize: 12, color: colors.textSecondary },
  row: { flexDirection: 'row', gap: 8 },
  stat: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: { fontSize: 11, color: colors.textSecondary },
  statValue: { fontSize: 18, fontWeight: '900', color: colors.textPrimary, marginTop: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginTop: 8 },
  empty: { fontSize: 13, color: colors.textSecondary },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardMain: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  cardSub: { fontSize: 12, color: colors.textSecondary },
  cardSide: { alignItems: 'flex-end', gap: 4 },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
  badgeBad: { color: colors.danger, backgroundColor: colors.dangerLight },
  reward: { fontSize: 13, fontWeight: '800', color: colors.success },
  moreBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  moreBtnText: { color: colors.primary, fontWeight: '700' },
});
