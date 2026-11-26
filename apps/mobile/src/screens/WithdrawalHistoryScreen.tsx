import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, Plus } from 'lucide-react-native';
import type { Withdrawal } from '@supporters/shared';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import { useScreenSecurity } from '../hooks/useScreenSecurity';
import { useWithdrawals } from '../features/wallet/hooks';
import { WITHDRAWAL_STATUS_LABELS, formatDateTime, formatRupees } from '../features/wallet/format';
import { messageForError } from '../lib/api';

/** Withdrawal requests, newest first, each with its status and (when there is one) the reason. */
export function WithdrawalHistoryScreen() {
  useScreenSecurity();
  const { navigate } = useApp();
  const query = useWithdrawals();
  const rows = query.data?.pages.flatMap((page) => page.data) ?? [];

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigate('wallet')}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title} accessibilityRole="header">
          Withdrawals
        </Text>
        <TouchableOpacity
          onPress={() => navigate('withdrawal')}
          style={styles.newBtn}
          accessibilityRole="button"
          accessibilityLabel="New withdrawal"
        >
          <Plus size={15} color={colors.primary} />
          <Text style={styles.newBtnText}>New</Text>
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
        {!query.isPending && rows.length === 0 && (
          <Text style={styles.empty}>You have not withdrawn anything yet.</Text>
        )}
        {rows.map((withdrawal) => (
          <Row key={withdrawal.id} withdrawal={withdrawal} />
        ))}
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
      </ScrollView>
    </View>
  );
}

function Row({ withdrawal }: { withdrawal: Withdrawal }) {
  const bad = withdrawal.status === 'rejected' || withdrawal.status === 'failed';
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${formatRupees(withdrawal.amount.amountPaise)}, ${WITHDRAWAL_STATUS_LABELS[withdrawal.status]}${withdrawal.reason ? `. ${withdrawal.reason}` : ''}`}
    >
      <View style={styles.cardMain}>
        <Text style={styles.cardTitle}>
          {formatRupees(withdrawal.amount.amountPaise)} to{' '}
          {withdrawal.method === 'upi' ? 'UPI' : 'bank account'} {withdrawal.maskedDestination}
        </Text>
        <Text style={styles.cardSub}>Requested {formatDateTime(withdrawal.createdAt)}</Text>
        {withdrawal.reason && <Text style={styles.reason}>{withdrawal.reason}</Text>}
      </View>
      <Text style={[styles.badge, bad && styles.badgeBad]}>
        {WITHDRAWAL_STATUS_LABELS[withdrawal.status]}
      </Text>
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
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  newBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  error: { color: colors.danger, fontSize: 13 },
  empty: { fontSize: 13, color: colors.textSecondary },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardMain: { flex: 1, gap: 2 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  cardSub: { fontSize: 11, color: colors.textSecondary },
  reason: { fontSize: 12, color: colors.textPrimary, marginTop: 2 },
  badge: {
    alignSelf: 'flex-start',
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
  moreBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  moreBtnText: { color: colors.primary, fontWeight: '700' },
});
