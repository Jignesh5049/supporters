import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowDownLeft, ArrowLeft, ArrowUpRight, Clock } from 'lucide-react-native';
import type { LedgerEntry } from '@supporters/shared';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import { useScreenSecurity } from '../hooks/useScreenSecurity';
import { useLedger, useWallet } from '../features/wallet/hooks';
import { formatDateTime, formatRupees } from '../features/wallet/format';
import { messageForError } from '../lib/api';

/** The wallet: the balance (a SUM of the ledger on the server) and the ledger itself. */
export function WalletScreen() {
  useScreenSecurity();
  const { navigate } = useApp();
  const wallet = useWallet();
  const ledger = useLedger();
  const entries = ledger.data?.pages.flatMap((page) => page.data) ?? [];

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
          Wallet
        </Text>
        <TouchableOpacity
          onPress={() => navigate('withdrawal_history')}
          style={styles.historyBtn}
          accessibilityRole="button"
          accessibilityLabel="Withdrawal requests"
        >
          <Clock size={15} color={colors.primary} />
          <Text style={styles.historyBtnText}>Requests</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {wallet.isPending && (
          <ActivityIndicator color={colors.primary} accessibilityLabel="Loading" />
        )}
        {wallet.isError && (
          <Text style={styles.error} accessibilityRole="alert">
            {messageForError(wallet.error)}
          </Text>
        )}
        {wallet.data && (
          <>
            <View style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>AVAILABLE TO WITHDRAW</Text>
              <Text
                style={styles.balance}
                accessibilityLabel={`Balance ${formatRupees(wallet.data.balance.amountPaise)}`}
              >
                {formatRupees(wallet.data.balance.amountPaise)}
              </Text>
              <TouchableOpacity
                onPress={() => navigate('withdrawal')}
                style={styles.withdrawBtn}
                accessibilityRole="button"
              >
                <ArrowUpRight size={16} color={colors.primary} />
                <Text style={styles.withdrawBtnText}>Withdraw money</Text>
              </TouchableOpacity>
              {wallet.data.balance.amountPaise < wallet.data.minWithdrawal.amountPaise && (
                <Text style={styles.balanceNote}>
                  You can withdraw from {formatRupees(wallet.data.minWithdrawal.amountPaise)}.
                </Text>
              )}
            </View>
            <View style={styles.row}>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Earned so far</Text>
                <Text style={styles.statValue}>
                  {formatRupees(wallet.data.lifetimeEarned.amountPaise)}
                </Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statLabel}>Being withdrawn</Text>
                <Text style={styles.statValue}>
                  {formatRupees(wallet.data.reserved.amountPaise)}
                </Text>
              </View>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle} accessibilityRole="header">
          History
        </Text>
        {ledger.isError && (
          <Text style={styles.error} accessibilityRole="alert">
            {messageForError(ledger.error)}
          </Text>
        )}
        {!ledger.isPending && entries.length === 0 && (
          <Text style={styles.empty}>Referral rewards and withdrawals show up here.</Text>
        )}
        {entries.map((entry) => (
          <LedgerRow key={entry.id} entry={entry} />
        ))}
        {ledger.hasNextPage && (
          <TouchableOpacity
            onPress={() => void ledger.fetchNextPage()}
            disabled={ledger.isFetchingNextPage}
            style={styles.moreBtn}
            accessibilityRole="button"
          >
            <Text style={styles.moreBtnText}>
              {ledger.isFetchingNextPage ? 'Loading...' : 'Load more'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

function LedgerRow({ entry }: { entry: LedgerEntry }) {
  const isCredit = entry.amount.amountPaise > 0;
  const amount = `${isCredit ? '+' : '-'}${formatRupees(Math.abs(entry.amount.amountPaise))}`;
  return (
    <View
      style={styles.entry}
      accessible
      accessibilityLabel={`${entry.description}, ${isCredit ? 'credit' : 'debit'} ${formatRupees(Math.abs(entry.amount.amountPaise))}, ${formatDateTime(entry.createdAt)}`}
    >
      <View style={[styles.entryIcon, isCredit ? styles.entryCredit : styles.entryDebit]}>
        {isCredit ? (
          <ArrowDownLeft size={16} color={colors.success} />
        ) : (
          <ArrowUpRight size={16} color={colors.gray500} />
        )}
      </View>
      <View style={styles.entryMain}>
        <Text style={styles.entryTitle}>{entry.description}</Text>
        <Text style={styles.entrySub}>{formatDateTime(entry.createdAt)}</Text>
      </View>
      <Text style={[styles.entryAmount, isCredit && { color: colors.success }]}>{amount}</Text>
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
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  historyBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  content: { padding: 16, gap: 12, paddingBottom: 40 },
  error: { color: colors.danger, fontSize: 13 },
  balanceCard: { backgroundColor: colors.primary, borderRadius: 20, padding: 20, gap: 10 },
  balanceLabel: { fontSize: 11, fontWeight: '700', color: colors.textWhite, opacity: 0.8 },
  balance: { fontSize: 34, fontWeight: '900', color: colors.textWhite },
  balanceNote: { fontSize: 12, color: colors.textWhite, opacity: 0.8 },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.card,
  },
  withdrawBtnText: { color: colors.primary, fontWeight: '800', fontSize: 14 },
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
  entry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryCredit: { backgroundColor: colors.successLight },
  entryDebit: { backgroundColor: colors.gray100 },
  entryMain: { flex: 1 },
  entryTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  entrySub: { fontSize: 11, color: colors.textSecondary },
  entryAmount: { fontSize: 14, fontWeight: '800', color: colors.textPrimary },
  moreBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  moreBtnText: { color: colors.primary, fontWeight: '700' },
});
