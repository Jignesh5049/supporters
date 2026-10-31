import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useApp } from '../../context/AppContext';
import { colors } from '../../styles/theme';
import { REFERRAL_REWARD_CONFIG } from '../../services/referralService';

export function WithdrawalScreen() {
  const { walletData, requestWithdrawal, navigate } = useApp();

  const [step, setStep] = useState<'form' | 'review' | 'success'>('form');
  const [method, setMethod] = useState<'UPI' | 'Bank Account'>('UPI');
  const [amount, setAmount] = useState('');

  // UPI Fields
  const [upiId, setUpiId] = useState('aarav.mehta@okaxis');

  // Bank Account Fields
  const [accountHolder, setAccountHolder] = useState('Aarav Mehta');
  const [bankName, setBankName] = useState('HDFC Bank Ltd');
  const [accountNumber, setAccountNumber] = useState('50100492834190');
  const [ifscCode, setIfscCode] = useState('HDFC0000049');

  const [errorMessage, setErrorMessage] = useState('');
  const [submittedRef, setSubmittedRef] = useState('');

  const numAmount = parseFloat(amount) || 0;

  const handleProceedToReview = () => {
    setErrorMessage('');

    if (!amount.trim() || isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid withdrawal amount.');
      return;
    }
    if (numAmount < REFERRAL_REWARD_CONFIG.minWithdrawalAmount) {
      setErrorMessage(
        `Minimum withdrawal amount is ₹${REFERRAL_REWARD_CONFIG.minWithdrawalAmount}.`,
      );
      return;
    }
    if (numAmount > walletData.availableBalance) {
      setErrorMessage(
        `Amount exceeds your available balance of ₹${walletData.availableBalance.toLocaleString('en-IN')}.`,
      );
      return;
    }

    if (method === 'UPI') {
      if (!upiId.trim() || !upiId.includes('@')) {
        setErrorMessage('Please enter a valid UPI ID (e.g. mobile@upi or name@bank).');
        return;
      }
    } else {
      if (!accountHolder.trim() || !accountNumber.trim() || !ifscCode.trim()) {
        setErrorMessage('Please complete all bank account details.');
        return;
      }
    }

    setStep('review');
  };

  const handleConfirmWithdrawal = () => {
    const res = requestWithdrawal({
      amount: numAmount,
      method,
      upiId: method === 'UPI' ? upiId.trim() : undefined,
      accountHolderName: method === 'Bank Account' ? accountHolder.trim() : undefined,
      accountNumber: method === 'Bank Account' ? accountNumber.trim() : undefined,
      ifscCode: method === 'Bank Account' ? ifscCode.trim() : undefined,
      bankName: method === 'Bank Account' ? bankName.trim() : undefined,
    });

    if (res.success) {
      setSubmittedRef(`WDL-${Math.floor(100000 + Math.random() * 900000)}`);
      setStep('success');
    } else {
      Alert.alert('Withdrawal Failed', res.message);
      setStep('form');
    }
  };

  return (
    <View style={styles.screenWrapper}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => (step === 'review' ? setStep('form') : navigate('wallet'))}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {step === 'success'
            ? 'Request Submitted'
            : step === 'review'
              ? 'Review Withdrawal'
              : 'Withdraw Money'}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {step === 'form' && (
          <View>
            {/* Balance Banner */}
            <View style={styles.balanceSnippet}>
              <View>
                <Text style={styles.balanceSnippetLabel}>Available Wallet Balance</Text>
                <Text style={styles.balanceSnippetAmount}>
                  ₹{walletData.availableBalance.toLocaleString('en-IN')}
                </Text>
              </View>
              <View style={styles.minTag}>
                <Text style={styles.minTagText}>
                  Min: ₹{REFERRAL_REWARD_CONFIG.minWithdrawalAmount}
                </Text>
              </View>
            </View>

            {/* Error Message */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#DC2626" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {/* Amount Field */}
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Withdrawal Amount (₹) *</Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.currencyPrefix}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder={`e.g. ${walletData.availableBalance || 500}`}
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.quickAmountRow}>
                {[100, 200, 300, walletData.availableBalance]
                  .filter((val, i, arr) => val > 0 && arr.indexOf(val) === i)
                  .map((val) => (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setAmount(val.toString())}
                      style={styles.quickPill}
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
                  onPress={() => setMethod('UPI')}
                  style={[styles.methodBtn, method === 'UPI' && styles.methodBtnActive]}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="phone-portrait-outline"
                    size={16}
                    color={method === 'UPI' ? colors.primary : '#64748B'}
                  />
                  <Text
                    style={[styles.methodBtnText, method === 'UPI' && styles.methodBtnTextActive]}
                  >
                    Instant UPI
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setMethod('Bank Account')}
                  style={[styles.methodBtn, method === 'Bank Account' && styles.methodBtnActive]}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="business-outline"
                    size={16}
                    color={method === 'Bank Account' ? colors.primary : '#64748B'}
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
                    onChangeText={setUpiId}
                    placeholder="e.g. mobile@upi, name@okhdfcbank"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                  />
                </View>
                <Text style={styles.helperText}>
                  Supported: Google Pay, PhonePe, Paytm, BHIM, Amazon Pay and all bank UPI handles.
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
                    onChangeText={setAccountHolder}
                    placeholder="Full name as in bank passbook"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Bank Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={bankName}
                    onChangeText={setBankName}
                    placeholder="e.g. State Bank of India, HDFC Bank"
                    placeholderTextColor="#94A3B8"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Account Number *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder="e.g. 50100492834190"
                    placeholderTextColor="#94A3B8"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>IFSC Code *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={ifscCode}
                    onChangeText={(v) => setIfscCode(v.toUpperCase())}
                    placeholder="e.g. HDFC0000049"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                  />
                </View>
              </View>
            )}

            {/* Submit Action */}
            <TouchableOpacity
              style={styles.continueBtn}
              onPress={handleProceedToReview}
              activeOpacity={0.85}
            >
              <Text style={styles.continueBtnText}>Review Withdrawal Details</Text>
              <Feather name="arrow-right" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2: REVIEW */}
        {step === 'review' && (
          <View>
            <View style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Ionicons name="receipt-outline" size={24} color={colors.primary} />
                <Text style={styles.reviewTitle}>Confirm Payout Summary</Text>
              </View>

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Withdrawal Amount</Text>
                <Text style={styles.reviewValueBig}>₹{numAmount.toLocaleString('en-IN')}</Text>
              </View>

              <View style={styles.reviewDivider} />

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Payout Mode</Text>
                <Text style={styles.reviewValue}>{method}</Text>
              </View>

              {method === 'UPI' ? (
                <View style={styles.reviewRow}>
                  <Text style={styles.reviewLabel}>Destination UPI</Text>
                  <Text style={styles.reviewValue}>{upiId}</Text>
                </View>
              ) : (
                <>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Account Holder</Text>
                    <Text style={styles.reviewValue}>{accountHolder}</Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>Bank & A/C</Text>
                    <Text style={styles.reviewValue}>
                      {bankName} (••••{accountNumber.slice(-4)})
                    </Text>
                  </View>
                  <View style={styles.reviewRow}>
                    <Text style={styles.reviewLabel}>IFSC Code</Text>
                    <Text style={styles.reviewValue}>{ifscCode}</Text>
                  </View>
                </>
              )}

              <View style={styles.reviewDivider} />

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Processing Fee</Text>
                <Text style={[styles.reviewValue, { color: '#16A34A' }]}>
                  ₹0 (Free via Supporters)
                </Text>
              </View>

              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Estimated Crediting</Text>
                <Text style={styles.reviewValue}>Within 24 to 48 business hours</Text>
              </View>
            </View>

            <View style={styles.securityBanner}>
              <Ionicons name="shield-checkmark" size={16} color="#15803D" />
              <Text style={styles.securityBannerText}>
                Encrypted bank-grade transmission. Your pending withdrawal will be reserved safely
                from your wallet balance.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={handleConfirmWithdrawal}
              activeOpacity={0.85}
            >
              <Feather name="check-circle" size={16} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Submit Withdrawal Request</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setStep('form')}
              activeOpacity={0.7}
            >
              <Text style={styles.editBtnText}>Edit Details</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 3: SUCCESS CONFIRMATION */}
        {step === 'success' && (
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={36} color="#FFFFFF" />
            </View>

            <Text style={styles.successTitle}>Withdrawal Request Submitted</Text>
            <Text style={styles.successAmount}>₹{numAmount.toLocaleString('en-IN')}</Text>

            <Text style={styles.successSubtitle}>
              Your withdrawal request has been scheduled for automated batch processing. It has been
              labeled as <Text style={{ fontWeight: '800', color: '#D97706' }}>Pending</Text> in
              your wallet history and reserved from available balance.
            </Text>

            <View style={styles.refBox}>
              <Text style={styles.refBoxLabel}>REQUEST TRACKING ID</Text>
              <Text style={styles.refBoxValue}>{submittedRef}</Text>
            </View>

            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => navigate('wallet')}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>Return to Wallet Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() => navigate('withdrawal_history')}
              activeOpacity={0.7}
            >
              <Text style={styles.trackBtnText}>View In Payout Requests ↗</Text>
            </TouchableOpacity>
          </View>
        )}

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
  container: {
    flex: 1,
    padding: 14,
  },
  balanceSnippet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  balanceSnippetLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  balanceSnippetAmount: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 2,
  },
  minTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  minTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  currencyPrefix: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: colors.textPrimary,
    paddingVertical: 12,
  },
  quickAmountRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  quickPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    borderRadius: 12,
  },
  methodBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  methodBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  methodBtnTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  methodDetailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 18,
  },
  methodCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: colors.textPrimary,
  },
  helperText: {
    fontSize: 10,
    color: colors.textSecondary,
    lineHeight: 14,
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 30,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 14,
  },
  reviewHeader: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  reviewTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  reviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  reviewDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginVertical: 8,
  },
  reviewLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  reviewValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  reviewValueBig: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primary,
  },
  securityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  securityBannerText: {
    flex: 1,
    fontSize: 10.5,
    color: '#15803D',
    lineHeight: 15,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  editBtn: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  successAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: colors.primary,
    marginVertical: 6,
  },
  successSubtitle: {
    fontSize: 11.5,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 17,
    marginBottom: 18,
  },
  refBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  refBoxLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  refBoxValue: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textPrimary,
    marginTop: 2,
    letterSpacing: 1,
  },
  doneBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  trackBtn: {
    paddingVertical: 8,
  },
  trackBtnText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
});
