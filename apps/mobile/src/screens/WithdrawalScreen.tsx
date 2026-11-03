import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { colors, spacing } from '../styles/theme';
import { REFERRAL_REWARD_CONFIG } from '../services/referralService';
import { useScreenSecurity } from '../hooks/useScreenSecurity';
import { authenticateBiometric } from '../lib/auth/biometrics';
import { WithdrawalForm } from '../features/wallet/components/WithdrawalForm';
import { WithdrawalReviewCard } from '../features/wallet/components/WithdrawalReviewCard';
import { WithdrawalSuccessCard } from '../features/wallet/components/WithdrawalSuccessCard';

export function WithdrawalScreen() {
  // Prevent screenshots and recordings of sensitive payout/banking screens
  useScreenSecurity('withdrawal-screen');

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

  const handleConfirmWithdrawal = async () => {
    // Biometric confirmation per OWASP MASVS L2 & mobile spec line 151
    const bioResult = await authenticateBiometric(
      `Authorize ₹${numAmount.toLocaleString('en-IN')} payout to ${method}`,
    );

    if (!bioResult.success) {
      Alert.alert(
        'Authentication Required',
        bioResult.error || 'Biometric identity verification cancelled.',
      );
      return;
    }

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
    <SafeAreaView style={styles.screenWrapper}>
      {/* Top Header Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => (step === 'review' ? setStep('form') : navigate('wallet'))}
          style={styles.backBtn}
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>
          {step === 'success'
            ? 'Request Submitted'
            : step === 'review'
              ? 'Review Withdrawal'
              : 'Withdraw Money'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {step === 'form' && (
          <WithdrawalForm
            availableBalance={walletData.availableBalance}
            minAmount={REFERRAL_REWARD_CONFIG.minWithdrawalAmount}
            amount={amount}
            onAmountChange={setAmount}
            method={method}
            onMethodChange={setMethod}
            upiId={upiId}
            onUpiIdChange={setUpiId}
            accountHolder={accountHolder}
            onAccountHolderChange={setAccountHolder}
            bankName={bankName}
            onBankNameChange={setBankName}
            accountNumber={accountNumber}
            onAccountNumberChange={setAccountNumber}
            ifscCode={ifscCode}
            onIfscCodeChange={setIfscCode}
            errorMessage={errorMessage}
            onProceed={handleProceedToReview}
          />
        )}

        {step === 'review' && (
          <WithdrawalReviewCard
            amount={numAmount}
            method={method}
            upiId={upiId}
            accountHolder={accountHolder}
            bankName={bankName}
            accountNumber={accountNumber}
            ifscCode={ifscCode}
            onConfirm={handleConfirmWithdrawal}
            onEdit={() => setStep('form')}
          />
        )}

        {step === 'success' && (
          <WithdrawalSuccessCard
            amount={numAmount}
            referenceId={submittedRef}
            onReturnToWallet={() => navigate('wallet')}
            onViewHistory={() => navigate('withdrawal_history')}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screenWrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  container: {
    flex: 1,
  },
});
