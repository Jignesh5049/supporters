import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';

export function WalletScreen() {
  const { walletData, navigate } = useApp();
  const [filterType, setFilterType] = useState<'All' | 'Credits' | 'Withdrawals'>('All');

  const filteredTransactions = walletData.transactions.filter((tx) => {
    if (filterType === 'Credits') return tx.amount > 0;
    if (filterType === 'Withdrawals') return tx.amount < 0 || tx.type === 'withdrawal';
    return true;
  });

  return (
    <View style={styles.screenWrapper}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigate('home')} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>App Wallet</Text>
        <TouchableOpacity
          onPress={() => navigate('withdrawal_history')}
          style={styles.historyBtn}
          activeOpacity={0.8}
        >
          <Feather name="clock" size={15} color={colors.primary} />
          <Text style={styles.historyBtnText}>Requests</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Main Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View style={styles.walletIconCircle}>
              <Ionicons name="wallet" size={20} color="#FFFFFF" />
            </View>
            <View style={styles.verifiedWalletBadge}>
              <Ionicons name="shield-checkmark" size={11} color="#FFFFFF" />
              <Text style={styles.verifiedWalletText}>Verified Wallet</Text>
            </View>
          </View>

          <Text style={styles.balanceLabel}>AVAILABLE BALANCE FOR WITHDRAWAL</Text>
          <Text style={styles.balanceAmount}>
            ₹{walletData.availableBalance.toLocaleString('en-IN')}
          </Text>

          {/* Quick Action Button */}
          <TouchableOpacity
            style={[
              styles.withdrawBtn,
              walletData.availableBalance <= 0 && styles.withdrawBtnDisabled,
            ]}
            onPress={() => navigate('withdrawal')}
            disabled={walletData.availableBalance <= 0}
            activeOpacity={0.85}
          >
            <Feather name="arrow-up-right" size={16} color="#FFFFFF" />
            <Text style={styles.withdrawBtnText}>Withdraw Money to Bank / UPI</Text>
          </TouchableOpacity>
        </View>

        {/* 3-Column Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconDot, { backgroundColor: '#EEF2FF' }]}>
              <Feather name="gift" size={13} color={colors.primary} />
            </View>
            <Text style={styles.summaryLabel}>Total Referral</Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>
              ₹{walletData.totalReferralEarnings.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconDot, { backgroundColor: '#FEF3C7' }]}>
              <Feather name="clock" size={13} color="#D97706" />
            </View>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={[styles.summaryValue, { color: '#D97706' }]}>
              ₹{walletData.pendingWithdrawals.toLocaleString('en-IN')}
            </Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconDot, { backgroundColor: '#DCFCE7' }]}>
              <Feather name="check-circle" size={13} color="#16A34A" />
            </View>
            <Text style={styles.summaryLabel}>Withdrawn</Text>
            <Text style={[styles.summaryValue, { color: '#16A34A' }]}>
              ₹{walletData.totalWithdrawn.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* Informative Notice */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.infoBoxText}>
            Referral earnings are credited as app wallet money. Withdrawals are processed directly
            to your verified bank account or UPI ID. Minimum withdrawal is ₹100.
          </Text>
        </View>

        {/* Transaction History Section */}
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Transaction History</Text>
            <TouchableOpacity onPress={() => navigate('withdrawal_history')}>
              <Text style={styles.payoutHistoryLink}>View Payouts ↗</Text>
            </TouchableOpacity>
          </View>

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            {(['All', 'Credits', 'Withdrawals'] as const).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setFilterType(tab)}
                style={[styles.filterPill, filterType === tab && styles.filterPillActive]}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.filterPillText, filterType === tab && styles.filterPillTextActive]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyBox}>
              <Feather name="inbox" size={30} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No transactions found</Text>
              <Text style={styles.emptySub}>
                Referral bonuses and withdrawal activities will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {filteredTransactions.map((tx) => {
                const isCredit = tx.amount > 0;
                const isPending = tx.status === 'Pending';
                const isCompleted = tx.status === 'Completed';
                const isFailed = tx.status === 'Failed';
                const isReversed = tx.status === 'Reversed';

                return (
                  <View key={tx.id} style={styles.txCard}>
                    <View
                      style={[
                        styles.txIconCircle,
                        isCredit && { backgroundColor: '#DCFCE7' },
                        !isCredit && isPending && { backgroundColor: '#FEF3C7' },
                        !isCredit && !isPending && { backgroundColor: '#F1F5F9' },
                      ]}
                    >
                      <Feather
                        name={isCredit ? 'arrow-down-left' : 'arrow-up-right'}
                        size={16}
                        color={isCredit ? '#16A34A' : isPending ? '#D97706' : '#64748B'}
                      />
                    </View>

                    <View style={styles.txDetailsCol}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          flexWrap: 'wrap',
                        }}
                      >
                        <Text style={styles.txTitle}>
                          {tx.title.replace(
                            /^(1st|2nd|3rd|\d+(?:st|nd|rd|th))\s+Referral\s+Reward\s+—\s*/i,
                            '',
                          )}
                        </Text>
                        {tx.type === 'referral_reward' && (
                          <View
                            style={{
                              backgroundColor: '#F3E8FF',
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: 4,
                            }}
                          >
                            <Text style={{ fontSize: 9, fontWeight: '700', color: '#A3238E' }}>
                              Referral
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.txMeta}>
                        {tx.createdAt} · Ref: {tx.referenceId}
                      </Text>
                      {tx.payoutDetails && (
                        <Text style={styles.txPayoutDetails}>{tx.payoutDetails}</Text>
                      )}
                    </View>

                    <View style={styles.txAmountCol}>
                      <Text
                        style={[
                          styles.txAmount,
                          isCredit ? { color: '#16A34A' } : { color: colors.textPrimary },
                        ]}
                      >
                        {isCredit
                          ? `+₹${tx.amount.toLocaleString('en-IN')}`
                          : `-₹${Math.abs(tx.amount).toLocaleString('en-IN')}`}
                      </Text>
                      <View
                        style={[
                          styles.statusTag,
                          isCompleted && styles.statusTagCompleted,
                          isPending && styles.statusTagPending,
                          isFailed && styles.statusTagFailed,
                          isReversed && styles.statusTagReversed,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusTagText,
                            isCompleted && styles.statusTagTextCompleted,
                            isPending && styles.statusTagTextPending,
                            isFailed && styles.statusTagTextFailed,
                            isReversed && styles.statusTagTextReversed,
                          ]}
                        >
                          {tx.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
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
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  historyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  container: {
    flex: 1,
    padding: 14,
  },
  balanceCard: {
    backgroundColor: '#0F172A',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  walletIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedWalletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedWalletText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginVertical: 6,
    letterSpacing: -0.5,
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  withdrawBtnDisabled: {
    opacity: 0.5,
  },
  withdrawBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
    alignItems: 'center',
  },
  summaryIconDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 9.5,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '900',
    marginTop: 2,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight,
    padding: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 14,
    alignItems: 'center',
  },
  infoBoxText: {
    flex: 1,
    fontSize: 11,
    color: colors.primary,
    lineHeight: 16,
  },
  historySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  payoutHistoryLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: colors.primary,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  emptyBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 8,
  },
  emptySub: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  transactionsList: {
    gap: 10,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
  },
  txIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  txDetailsCol: {
    flex: 1,
  },
  txTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  txMeta: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  txPayoutDetails: {
    fontSize: 9.5,
    color: '#64748B',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  txAmountCol: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  txAmount: {
    fontSize: 13,
    fontWeight: '900',
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
  },
  statusTagCompleted: {
    backgroundColor: '#DCFCE7',
  },
  statusTagPending: {
    backgroundColor: '#FEF3C7',
  },
  statusTagFailed: {
    backgroundColor: '#FEE2E2',
  },
  statusTagReversed: {
    backgroundColor: '#F3E8FF',
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusTagTextCompleted: {
    color: '#16A34A',
  },
  statusTagTextPending: {
    color: '#D97706',
  },
  statusTagTextFailed: {
    color: '#DC2626',
  },
  statusTagTextReversed: {
    color: '#7E22CE',
  },
});
