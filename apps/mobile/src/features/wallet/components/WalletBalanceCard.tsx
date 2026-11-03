import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Wallet, ShieldCheck, ArrowUpRight } from 'lucide-react-native';
import { colors } from '../../../styles/theme';

interface WalletBalanceCardProps {
  availableBalance: number;
  onWithdraw: () => void;
}

export function WalletBalanceCard({ availableBalance, onWithdraw }: WalletBalanceCardProps) {
  const isWithdrawDisabled = availableBalance <= 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.walletIconCircle}>
          <Wallet size={20} color="#FFFFFF" />
        </View>
        <View style={styles.verifiedBadge}>
          <ShieldCheck size={13} color="#FFFFFF" />
          <Text style={styles.verifiedText}>Verified Wallet</Text>
        </View>
      </View>

      <Text style={styles.label}>AVAILABLE BALANCE FOR WITHDRAWAL</Text>
      <Text style={styles.amount}>₹{availableBalance.toLocaleString('en-IN')}</Text>

      <TouchableOpacity
        style={[styles.withdrawBtn, isWithdrawDisabled && styles.withdrawBtnDisabled]}
        onPress={onWithdraw}
        disabled={isWithdrawDisabled}
        activeOpacity={0.85}
      >
        <ArrowUpRight size={16} color="#FFFFFF" />
        <Text style={styles.withdrawBtnText}>Withdraw Money to Bank / UPI</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  walletIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  label: {
    color: '#C7D2FE',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  amount: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginTop: 4,
    marginBottom: 16,
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 12,
  },
  withdrawBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  withdrawBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
