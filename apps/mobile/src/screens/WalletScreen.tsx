import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { ArrowLeft, Clock, Info, Inbox } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import { useScreenSecurity } from '../hooks/useScreenSecurity';
import {
  WalletBalanceCard,
  WalletSummaryCards,
  WalletTransactionItem,
} from '../features/wallet/components';

export function WalletScreen() {
  useScreenSecurity();
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
        <TouchableOpacity
          onPress={() => navigate('home')}
          style={styles.backBtn}
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>App Wallet</Text>
        <TouchableOpacity
          onPress={() => navigate('withdrawal_history')}
          style={styles.historyBtn}
          activeOpacity={0.8}
        >
          <Clock size={15} color={colors.primary} />
          <Text style={styles.historyBtnText}>Requests</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <WalletBalanceCard
          availableBalance={walletData.availableBalance}
          onWithdraw={() => navigate('withdrawal')}
        />

        <WalletSummaryCards
          totalReferralEarnings={walletData.totalReferralEarnings}
          pendingWithdrawals={walletData.pendingWithdrawals}
          totalWithdrawn={walletData.totalWithdrawn}
        />

        {/* Informative Notice */}
        <View style={styles.infoBox}>
          <Info size={16} color={colors.primary} />
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
              <Inbox size={30} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No transactions found</Text>
              <Text style={styles.emptySub}>
                Referral bonuses and withdrawal activities will appear here.
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {filteredTransactions.map((tx) => (
                <WalletTransactionItem key={tx.id} tx={tx} />
              ))}
            </View>
          )}
        </View>
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
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF0FA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  historyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  container: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EEF0FA',
    marginHorizontal: 12,
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 14,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 11,
    color: '#3730A3',
    lineHeight: 16,
  },
  historySection: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  payoutHistoryLink: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 8,
    marginBottom: 2,
  },
  emptySub: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  transactionsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
});
