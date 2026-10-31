import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check, Clock, AlertCircle } from 'lucide-react-native';
import { colors } from '../../../styles/theme';
import type { ReferralStat } from '../../../../mock';

export type ReferralHistoryItem = ReferralStat['history'][number];

interface ReferralHistoryListProps {
  history: ReferralHistoryItem[];
}

export function ReferralHistoryList({ history }: ReferralHistoryListProps) {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Referral History</Text>
        <Text style={styles.count}>{history.length} records</Text>
      </View>

      <View style={styles.list}>
        {history.map((item) => {
          const isSuccess = item.status === 'Successful';
          const isPending = item.status === 'Pending';
          const isIneligible = item.status === 'Ineligible' || item.status === 'Failed';

          return (
            <View key={item.id} style={styles.item}>
              <View
                style={[
                  styles.statusCircle,
                  isSuccess && styles.statusCircleSuccess,
                  isPending && styles.statusCirclePending,
                  isIneligible && styles.statusCircleIneligible,
                ]}
              >
                {isSuccess && <Check size={14} color="#16A34A" strokeWidth={3} />}
                {isPending && <Clock size={14} color="#D97706" />}
                {isIneligible && <AlertCircle size={14} color="#64748B" />}
              </View>

              <View style={styles.info}>
                <Text style={styles.name}>{item.businessName}</Text>
                <Text style={styles.sub}>
                  {item.city} · {item.date}
                </Text>
                {item.notes && <Text style={styles.note}>{item.notes}</Text>}
              </View>

              <View style={styles.rewardCol}>
                <Text
                  style={[
                    styles.rewardAmount,
                    item.rewardAmount > 0 ? styles.rewardPositive : styles.rewardZero,
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
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  count: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  list: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  statusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCircleSuccess: {
    backgroundColor: '#DCFCE7',
  },
  statusCirclePending: {
    backgroundColor: '#FEF3C7',
  },
  statusCircleIneligible: {
    backgroundColor: '#F1F5F9',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  sub: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  note: {
    fontSize: 10,
    color: '#D97706',
    marginTop: 2,
  },
  rewardCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  rewardAmount: {
    fontSize: 14,
    fontWeight: '800',
  },
  rewardPositive: {
    color: '#16A34A',
  },
  rewardZero: {
    color: '#64748B',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
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
    fontSize: 10,
    fontWeight: '600',
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
