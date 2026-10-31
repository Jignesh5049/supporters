import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Wallet, ArrowRight } from 'lucide-react-native';
import { colors } from '../../../styles/theme';

interface ReferralWalletBannerProps {
  onNavigateWallet: () => void;
}

export function ReferralWalletBanner({ onNavigateWallet }: ReferralWalletBannerProps) {
  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        <View style={styles.iconCircle}>
          <Wallet size={18} color="#FFFFFF" />
        </View>
        <View style={styles.textCol}>
          <Text style={styles.title}>App Wallet Balance</Text>
          <Text style={styles.sub} numberOfLines={2}>
            Referral credits appear in your wallet for withdrawal
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.actionBtn} onPress={onNavigateWallet} activeOpacity={0.8}>
        <Text style={styles.actionBtnText}>View Wallet</Text>
        <ArrowRight size={13} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 16,
    gap: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  sub: {
    fontSize: 11,
    color: '#94A3B8',
    lineHeight: 15,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
