import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import type { WalletTransaction } from '../../../../mock';

interface WalletTransactionItemProps {
  tx: WalletTransaction;
}

export function WalletTransactionItem({ tx }: WalletTransactionItemProps) {
  const isCredit = tx.amount > 0;
  const isPending = tx.status === 'Pending';
  const isFailed = tx.status === 'Failed';
  const isReversed = tx.status === 'Reversed';

  return (
    <View style={styles.card}>
      <View
        style={[
          styles.iconCircle,
          isCredit && styles.iconCredit,
          !isCredit && isPending && styles.iconPending,
          !isCredit && !isPending && styles.iconDebit,
        ]}
      >
        {isCredit ? (
          <ArrowDownLeft size={16} color="#16A34A" />
        ) : (
          <ArrowUpRight size={16} color={isPending ? '#D97706' : '#64748B'} />
        )}
      </View>

      <View style={styles.detailsCol}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>
            {tx.title.replace(/^(1st|2nd|3rd|\d+(?:st|nd|rd|th))\s+Referral\s+Reward\s+—\s*/i, '')}
          </Text>
          {tx.type === 'referral_reward' && (
            <View style={styles.referralBadge}>
              <Text style={styles.referralBadgeText}>Referral</Text>
            </View>
          )}
        </View>
        <Text style={styles.meta}>
          {tx.createdAt} · Ref: {tx.referenceId}
        </Text>
        {tx.payoutDetails && <Text style={styles.payoutDetails}>{tx.payoutDetails}</Text>}
      </View>

      <View style={styles.amountCol}>
        <Text style={[styles.amount, isCredit ? styles.amountCredit : styles.amountDebit]}>
          {isCredit
            ? `+₹${tx.amount.toLocaleString('en-IN')}`
            : `-₹${Math.abs(tx.amount).toLocaleString('en-IN')}`}
        </Text>
        <View
          style={[
            styles.statusPill,
            tx.status === 'Completed' && styles.statusCompleted,
            isPending && styles.statusPending,
            (isFailed || isReversed) && styles.statusFailed,
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              tx.status === 'Completed' && styles.statusTextCompleted,
              isPending && styles.statusTextPending,
              (isFailed || isReversed) && styles.statusTextFailed,
            ]}
          >
            {tx.status}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCredit: {
    backgroundColor: '#DCFCE7',
  },
  iconPending: {
    backgroundColor: '#FEF3C7',
  },
  iconDebit: {
    backgroundColor: '#F1F5F9',
  },
  detailsCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  referralBadge: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  referralBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#A3238E',
  },
  meta: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  payoutDetails: {
    fontSize: 11,
    color: '#0D9488',
    fontWeight: '500',
    marginTop: 2,
  },
  amountCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontSize: 14,
    fontWeight: '800',
  },
  amountCredit: {
    color: '#16A34A',
  },
  amountDebit: {
    color: colors.textPrimary,
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusCompleted: {
    backgroundColor: '#DCFCE7',
  },
  statusPending: {
    backgroundColor: '#FEF3C7',
  },
  statusFailed: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statusTextCompleted: {
    color: '#16A34A',
  },
  statusTextPending: {
    color: '#D97706',
  },
  statusTextFailed: {
    color: '#DC2626',
  },
});
