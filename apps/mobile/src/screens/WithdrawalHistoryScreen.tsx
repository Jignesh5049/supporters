import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';

export function WithdrawalHistoryScreen() {
  const { walletData, navigate } = useApp();

  return (
    <View style={styles.screenWrapper}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigate('wallet')} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Withdrawal Requests</Text>
        <TouchableOpacity onPress={() => navigate('withdrawal')} style={styles.newBtn}>
          <Feather name="plus" size={16} color={colors.primary} />
          <Text style={styles.newBtnText}>New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {walletData.withdrawalRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Feather name="clock" size={28} color="#94A3B8" />
            </View>
            <Text style={styles.emptyTitle}>No withdrawal requests yet</Text>
            <Text style={styles.emptySubtitle}>
              When you submit a payout request for your referral earnings, its progress (Pending, Processing, Completed) will be tracked here.
            </Text>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigate('withdrawal')}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>Request Withdrawal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.list}>
            {walletData.withdrawalRequests.map((req) => {
              const isPending = req.status === 'Pending';
              const isProcessing = req.status === 'Processing';
              const isCompleted = req.status === 'Completed';
              const isRejected = req.status === 'Rejected';

              return (
                <View key={req.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View>
                      <Text style={styles.refId}>{req.referenceId}</Text>
                      <Text style={styles.date}>{req.createdAt}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusPill,
                        isPending && styles.pillPending,
                        isProcessing && styles.pillProcessing,
                        isCompleted && styles.pillCompleted,
                        isRejected && styles.pillRejected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          isPending && styles.textPending,
                          isProcessing && styles.textProcessing,
                          isCompleted && styles.textCompleted,
                          isRejected && styles.textRejected,
                        ]}
                      >
                        {req.status}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Payout Amount</Text>
                    <Text style={styles.amountVal}>₹{req.amount.toLocaleString('en-IN')}</Text>
                  </View>

                  <View style={styles.detailsRow}>
                    <Text style={styles.detailText}>
                      Method: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{req.method}</Text>
                    </Text>
                    {req.method === 'UPI' && req.upiId && (
                      <Text style={styles.detailText}>
                        VPA: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{req.upiId}</Text>
                      </Text>
                    )}
                    {req.method === 'Bank Account' && req.accountNumber && (
                      <Text style={styles.detailText}>
                        A/C: <Text style={{ fontWeight: '700', color: colors.textPrimary }}>••••{req.accountNumber.slice(-4)}</Text> ({req.ifscCode})
                      </Text>
                    )}
                  </View>

                  {req.estimatedDate && (
                    <View style={styles.etaBox}>
                      <Ionicons name="time-outline" size={13} color="#64748B" />
                      <Text style={styles.etaText}>Estimated: {req.estimatedDate}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
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
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.primaryLight,
  },
  newBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  container: {
    flex: 1,
    padding: 14,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
    marginBottom: 16,
  },
  actionBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  refId: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  date: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillPending: {
    backgroundColor: '#FEF3C7',
  },
  pillProcessing: {
    backgroundColor: '#E0F2FE',
  },
  pillCompleted: {
    backgroundColor: '#DCFCE7',
  },
  pillRejected: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  textPending: {
    color: '#D97706',
  },
  textProcessing: {
    color: '#0284C7',
  },
  textCompleted: {
    color: '#16A34A',
  },
  textRejected: {
    color: '#DC2626',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderLight,
    marginVertical: 4,
  },
  amountLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  amountVal: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primary,
  },
  detailsRow: {
    marginTop: 6,
    gap: 2,
  },
  detailText: {
    fontSize: 11,
    color: '#64748B',
  },
  etaBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 8,
  },
  etaText: {
    fontSize: 10,
    color: '#64748B',
  },
});
