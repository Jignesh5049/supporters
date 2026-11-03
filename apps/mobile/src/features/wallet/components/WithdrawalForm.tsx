import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { AlertCircle, Smartphone, Building2, ArrowRight } from 'lucide-react-native';
import { colors, spacing, borderRadius } from '../../../styles/theme';

interface WithdrawalFormProps {
  availableBalance: number;
  minAmount: number;
  amount: string;
  onAmountChange: (val: string) => void;
  method: 'UPI' | 'Bank Account';
  onMethodChange: (m: 'UPI' | 'Bank Account') => void;
  upiId: string;
  onUpiIdChange: (val: string) => void;
  accountHolder: string;
  onAccountHolderChange: (val: string) => void;
  bankName: string;
  onBankNameChange: (val: string) => void;
  accountNumber: string;
  onAccountNumberChange: (val: string) => void;
  ifscCode: string;
  onIfscCodeChange: (val: string) => void;
  errorMessage: string;
  onProceed: () => void;
}

export function WithdrawalForm({
  availableBalance,
  minAmount,
  amount,
  onAmountChange,
  method,
  onMethodChange,
  upiId,
  onUpiIdChange,
  accountHolder,
  onAccountHolderChange,
  bankName,
  onBankNameChange,
  accountNumber,
  onAccountNumberChange,
  ifscCode,
  onIfscCodeChange,
  errorMessage,
  onProceed,
}: WithdrawalFormProps) {
  const quickPillAmounts = [100, 200, 500, availableBalance].filter(
    (val, i, arr) => val > 0 && arr.indexOf(val) === i,
  );

  return (
    <View style={styles.container}>
      {/* Balance Snippet */}
      <View style={styles.balanceSnippet}>
        <View>
          <Text style={styles.balanceSnippetLabel}>Available Wallet Balance</Text>
          <Text style={styles.balanceSnippetAmount}>
            ₹{availableBalance.toLocaleString('en-IN')}
          </Text>
        </View>
        <View style={styles.minTag}>
          <Text style={styles.minTagText}>Min: ₹{minAmount}</Text>
        </View>
      </View>

      {/* Error Message */}
      {Boolean(errorMessage) && (
        <View style={styles.errorBox}>
          <AlertCircle size={15} color="#DC2626" />
          <Text style={styles.errorText}>{errorMessage}</Text>
        </View>
      )}

      {/* Amount Field */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Withdrawal Amount (₹) *</Text>
        <View style={styles.amountInputRow}>
          <Text style={styles.currencyPrefix}>₹</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={onAmountChange}
            placeholder={`e.g. ${availableBalance || 500}`}
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.quickAmountRow}>
          {quickPillAmounts.map((val) => (
            <TouchableOpacity
              key={val}
              onPress={() => onAmountChange(val.toString())}
              style={styles.quickPill}
              activeOpacity={0.8}
            >
              <Text style={styles.quickPillText}>₹{val}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Method Tabs */}
      <View style={styles.formGroup}>
        <Text style={styles.formLabel}>Select Payout Method *</Text>
        <View style={styles.methodSelector}>
          <TouchableOpacity
            onPress={() => onMethodChange('UPI')}
            style={[styles.methodBtn, method === 'UPI' && styles.methodBtnActive]}
            activeOpacity={0.8}
          >
            <Smartphone size={16} color={method === 'UPI' ? colors.primary : colors.textMuted} />
            <Text style={[styles.methodBtnText, method === 'UPI' && styles.methodBtnTextActive]}>
              Instant UPI
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onMethodChange('Bank Account')}
            style={[styles.methodBtn, method === 'Bank Account' && styles.methodBtnActive]}
            activeOpacity={0.8}
          >
            <Building2
              size={16}
              color={method === 'Bank Account' ? colors.primary : colors.textMuted}
            />
            <Text
              style={[
                styles.methodBtnText,
                method === 'Bank Account' && styles.methodBtnTextActive,
              ]}
            >
              Bank Transfer
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Method Specific Fields */}
      {method === 'UPI' ? (
        <View style={styles.methodDetailsCard}>
          <Text style={styles.methodCardTitle}>Enter UPI Virtual Payment Address</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>UPI ID (VPA) *</Text>
            <TextInput
              style={styles.textInput}
              value={upiId}
              onChangeText={onUpiIdChange}
              placeholder="e.g. mobile@upi, name@okhdfcbank"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
            />
          </View>
          <Text style={styles.helperText}>
            Supported: Google Pay, PhonePe, Paytm, BHIM, and all bank UPI handles.
          </Text>
        </View>
      ) : (
        <View style={styles.methodDetailsCard}>
          <Text style={styles.methodCardTitle}>Enter Verified Bank Account Details</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Account Holder Name *</Text>
            <TextInput
              style={styles.textInput}
              value={accountHolder}
              onChangeText={onAccountHolderChange}
              placeholder="Full name as in bank passbook"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Bank Name</Text>
            <TextInput
              style={styles.textInput}
              value={bankName}
              onChangeText={onBankNameChange}
              placeholder="e.g. State Bank of India, HDFC Bank"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Account Number *</Text>
            <TextInput
              style={styles.textInput}
              value={accountNumber}
              onChangeText={onAccountNumberChange}
              placeholder="e.g. 50100492834190"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>IFSC Code *</Text>
            <TextInput
              style={styles.textInput}
              value={ifscCode}
              onChangeText={(v) => onIfscCodeChange(v.toUpperCase())}
              placeholder="e.g. HDFC0000049"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />
          </View>
        </View>
      )}

      {/* Submit Action */}
      <TouchableOpacity style={styles.continueBtn} onPress={onProceed} activeOpacity={0.85}>
        <Text style={styles.continueBtnText}>Review Withdrawal Details</Text>
        <ArrowRight size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
  },
  balanceSnippet: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  balanceSnippetLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  balanceSnippetAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginTop: 2,
  },
  minTag: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  minTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  currencyPrefix: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  quickAmountRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  methodSelector: {
    flexDirection: 'row',
    gap: 10,
  },
  methodBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
  },
  methodBtnActive: {
    borderColor: colors.primary,
    backgroundColor: '#FBF7FC',
  },
  methodBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  methodBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  methodDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
  },
  methodCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.textPrimary,
  },
  helperText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
  },
  continueBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
