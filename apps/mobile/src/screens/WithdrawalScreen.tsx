import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { randomUUID } from 'expo-crypto';
import { ArrowLeft, CheckCircle2, ShieldCheck } from 'lucide-react-native';
import { WALLET, type PayoutAccount } from '@supporters/shared';
import { useApp } from '../context/AppContext';
import { colors } from '../styles/theme';
import { useScreenSecurity } from '../hooks/useScreenSecurity';
import {
  usePayoutAccount,
  useSavePayoutAccount,
  useWallet,
  useWithdraw,
} from '../features/wallet/hooks';
import { ConfirmationCancelledError } from '../features/wallet/guarded';
import {
  EMPTY_PAYOUT_FORM,
  formatDateTime,
  formatRupees,
  parsePayoutForm,
  rupeesToPaise,
  type PayoutFormErrors,
  type PayoutFormValues,
} from '../features/wallet/format';
import { ApiError, messageForError } from '../lib/api';

/** Turns the API's money-flow errors into plain advice. */
function withdrawalMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'WITHDRAWAL_PENDING':
        return 'You already have a withdrawal in progress. Ask for another once it is paid.';
      case 'INSUFFICIENT_BALANCE':
        return 'Your balance is lower than this amount.';
      case 'PAYOUT_ACCOUNT_REQUIRED':
        return 'Add your payout details first.';
      case 'PAYOUT_ACCOUNT_NOT_VALIDATED':
        return 'Your payout details are still being verified. Try again in a few minutes.';
      case 'PAYOUT_DETAILS_RECENTLY_CHANGED':
        return 'You changed your payout details recently. Withdrawals open again 24 hours after the change.';
      case 'PAYOUTS_NOT_CONFIGURED':
        return 'Withdrawals are not open yet. Your balance is safe in your wallet.';
      default:
    }
  }
  return messageForError(error);
}

type Step = 'form' | 'review' | 'done';

export function WithdrawalScreen() {
  useScreenSecurity();
  const { navigate } = useApp();
  const wallet = useWallet();
  const account = usePayoutAccount();
  const withdraw = useWithdraw();
  const [step, setStep] = useState<Step>('form');
  const [amountText, setAmountText] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  // One key per intended withdrawal, reused when the user retries after a network failure.
  const idempotencyKey = useRef<string | null>(null);

  if (wallet.isPending || account.isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} accessibilityLabel="Loading" />
      </View>
    );
  }
  if (wallet.isError || account.isError) {
    return (
      <View style={styles.center}>
        <Text style={styles.error} accessibilityRole="alert">
          {messageForError(wallet.error ?? account.error)}
        </Text>
      </View>
    );
  }

  const { balance, minWithdrawal } = wallet.data;
  const payout = account.data;
  const blockedUntil =
    payout && Date.parse(payout.withdrawalsAllowedAt) > Date.now()
      ? payout.withdrawalsAllowedAt
      : null;
  const isReady = payout?.validationStatus === 'validated' && blockedUntil === null;
  const paise = rupeesToPaise(amountText);

  const handleReview = () => {
    if (paise === null) setAmountError('Enter an amount in rupees, like 250 or 250.50');
    else if (paise < minWithdrawal.amountPaise)
      setAmountError(`The minimum withdrawal is ${formatRupees(minWithdrawal.amountPaise)}`);
    else if (paise > balance.amountPaise)
      setAmountError(`You can withdraw up to ${formatRupees(balance.amountPaise)}`);
    else {
      setAmountError(null);
      setStep('review');
    }
  };

  const handleConfirm = () => {
    if (paise === null) return;
    idempotencyKey.current ??= randomUUID();
    withdraw.mutate(
      { key: idempotencyKey.current, amountPaise: paise },
      {
        onSuccess: () => setStep('done'),
        onError: (error) => {
          // A definite answer from the server ends this intent; an unknown outcome keeps the key.
          if (error instanceof ApiError && error.status > 0 && error.status < 500) {
            idempotencyKey.current = null;
          }
        },
      },
    );
  };

  const wasCancelled = withdraw.error instanceof ConfirmationCancelledError;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
          Withdraw money
        </Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {step === 'done' ? (
          <View style={styles.card}>
            <CheckCircle2 size={44} color={colors.success} />
            <Text style={styles.cardTitle}>Withdrawal requested</Text>
            <Text style={styles.note}>
              We approve requests within 3 working days and then pay out. You will get a
              notification at each step.
            </Text>
            <PrimaryButton label="Back to wallet" onPress={() => navigate('wallet')} />
          </View>
        ) : (
          <>
            <PayoutAccountCard account={payout} />

            <View style={styles.card}>
              <Text style={styles.cardTitle} accessibilityRole="header">
                Withdraw
              </Text>
              <Text style={styles.note}>
                Available {formatRupees(balance.amountPaise)}. Minimum{' '}
                {formatRupees(minWithdrawal.amountPaise)}, one request at a time. We pay any fees.
              </Text>
              {!payout && <Text style={styles.note}>Add your payout details above first.</Text>}
              {payout?.validationStatus === 'pending' && (
                <Text style={styles.note}>Your payout details are being verified by the bank.</Text>
              )}
              {payout?.validationStatus === 'failed' && (
                <Text style={styles.error} accessibilityRole="alert">
                  The bank could not verify these details. Change them above and try again.
                </Text>
              )}
              {blockedUntil && (
                <Text style={styles.notice}>
                  You changed your payout details recently. Withdrawals open again on{' '}
                  {formatDateTime(blockedUntil)} ({WALLET.payoutDetailsCooldownHours}-hour safety
                  pause).
                </Text>
              )}

              {step === 'form' && (
                <>
                  <Field
                    label="Amount in rupees"
                    value={amountText}
                    editable={isReady}
                    keyboardType="decimal-pad"
                    placeholder={`${minWithdrawal.amountPaise / 100}`}
                    error={amountError}
                    onChangeText={(text) => {
                      setAmountText(text);
                      idempotencyKey.current = null;
                    }}
                  />
                  <PrimaryButton label="Review" onPress={handleReview} disabled={!isReady} />
                </>
              )}

              {step === 'review' && payout && paise !== null && (
                <>
                  <View style={styles.summary}>
                    <SummaryRow label="Amount" value={formatRupees(paise)} />
                    <SummaryRow label="To" value={payout.maskedDestination} />
                    <SummaryRow label="Name" value={payout.holderName} />
                  </View>
                  <Text style={styles.note}>
                    You will be asked to confirm with your fingerprint, face or device passcode.
                  </Text>
                  {withdraw.isError && !wasCancelled && (
                    <Text style={styles.error} accessibilityRole="alert">
                      {withdrawalMessage(withdraw.error)}
                    </Text>
                  )}
                  {wasCancelled && (
                    <Text style={styles.note} accessibilityRole="alert">
                      Not confirmed, so nothing was sent.
                    </Text>
                  )}
                  <PrimaryButton
                    label={withdraw.isPending ? 'Sending...' : 'Confirm withdrawal'}
                    onPress={handleConfirm}
                    disabled={withdraw.isPending}
                  />
                  <TouchableOpacity
                    onPress={() => {
                      withdraw.reset();
                      setStep('form');
                    }}
                    disabled={withdraw.isPending}
                    style={styles.linkBtn}
                    accessibilityRole="button"
                  >
                    <Text style={styles.linkBtnText}>Edit amount</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PayoutAccountCard({ account }: { account: PayoutAccount | null }) {
  const [isEditing, setEditing] = useState(account === null);
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle} accessibilityRole="header">
        Where to send the money
      </Text>
      {account && !isEditing && (
        <>
          <SummaryRow
            label={account.method === 'upi' ? 'UPI id' : 'Bank account'}
            value={account.maskedDestination}
          />
          <SummaryRow label="Name on the account" value={account.holderName} />
          <Text style={styles.badge}>
            {account.validationStatus === 'validated'
              ? 'Verified'
              : account.validationStatus === 'pending'
                ? 'Being verified by the bank'
                : 'Could not be verified'}
          </Text>
          {!account.isNameMatch && (
            <Text style={styles.notice}>
              The name differs from your profile, so our team checks withdrawals by hand.
            </Text>
          )}
          <TouchableOpacity
            onPress={() => setEditing(true)}
            style={styles.linkBtn}
            accessibilityRole="button"
          >
            <Text style={styles.linkBtnText}>Change details</Text>
          </TouchableOpacity>
        </>
      )}
      {isEditing && (
        <PayoutAccountForm
          hasAccount={account !== null}
          onDone={() => setEditing(false)}
          onCancel={account ? () => setEditing(false) : undefined}
        />
      )}
    </View>
  );
}

function PayoutAccountForm({
  hasAccount,
  onDone,
  onCancel,
}: {
  hasAccount: boolean;
  onDone: () => void;
  onCancel: (() => void) | undefined;
}) {
  const save = useSavePayoutAccount();
  const [values, setValues] = useState<PayoutFormValues>(EMPTY_PAYOUT_FORM);
  const [errors, setErrors] = useState<PayoutFormErrors>({});
  const set = <K extends keyof PayoutFormValues>(key: K, value: PayoutFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const handleSave = () => {
    const result = parsePayoutForm(values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    save.mutate(result.data, { onSuccess: onDone });
  };

  const wasCancelled = save.error instanceof ConfirmationCancelledError;

  return (
    <>
      {hasAccount && (
        <Text style={styles.notice}>
          After you change these details, withdrawals are paused for{' '}
          {WALLET.payoutDetailsCooldownHours} hours and we alert you by push and email.
        </Text>
      )}
      <View style={styles.methodRow} accessibilityRole="radiogroup">
        {(['upi', 'bank'] as const).map((method) => (
          <TouchableOpacity
            key={method}
            onPress={() => set('method', method)}
            style={[styles.methodBtn, values.method === method && styles.methodBtnOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected: values.method === method }}
          >
            <Text style={[styles.methodText, values.method === method && styles.methodTextOn]}>
              {method === 'upi' ? 'UPI' : 'Bank account'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <Field
        label="Name on the account"
        value={values.holderName}
        onChangeText={(text) => set('holderName', text)}
        error={errors.holderName ?? null}
        autoComplete="name"
      />
      {values.method === 'upi' ? (
        <Field
          label="UPI id"
          value={values.upiId}
          onChangeText={(text) => set('upiId', text)}
          error={errors.upiId ?? null}
          placeholder="name@bank"
          autoCapitalize="none"
          autoCorrect={false}
        />
      ) : (
        <>
          <Field
            label="Account number"
            value={values.accountNumber}
            onChangeText={(text) => set('accountNumber', text)}
            error={errors.accountNumber ?? null}
            keyboardType="number-pad"
          />
          <Field
            label="Confirm account number"
            value={values.confirmAccountNumber}
            onChangeText={(text) => set('confirmAccountNumber', text)}
            error={errors.confirmAccountNumber ?? null}
            keyboardType="number-pad"
          />
          <Field
            label="IFSC"
            value={values.ifsc}
            onChangeText={(text) => set('ifsc', text)}
            error={errors.ifsc ?? null}
            autoCapitalize="characters"
            autoCorrect={false}
          />
        </>
      )}
      <View style={styles.secureRow}>
        <ShieldCheck size={14} color={colors.primary} />
        <Text style={styles.note}>
          Your details are encrypted. We show only the last digits, and the bank checks the name.
        </Text>
      </View>
      {save.isError && !wasCancelled && (
        <Text style={styles.error} accessibilityRole="alert">
          {messageForError(save.error)}
        </Text>
      )}
      {wasCancelled && (
        <Text style={styles.note} accessibilityRole="alert">
          Not confirmed, so nothing was saved.
        </Text>
      )}
      <PrimaryButton
        label={save.isPending ? 'Verifying...' : 'Save and verify'}
        onPress={handleSave}
        disabled={save.isPending}
      />
      {onCancel && (
        <TouchableOpacity onPress={onCancel} style={styles.linkBtn} accessibilityRole="button">
          <Text style={styles.linkBtnText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

function Field({
  label,
  error,
  ...input
}: { label: string; error: string | null } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, error ? styles.inputError : null]}
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        {...input}
      />
      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean | undefined;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.primaryBtn, disabled && styles.primaryBtnOff]}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
    >
      <Text style={styles.primaryBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
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
  content: { padding: 16, gap: 12, paddingBottom: 60 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  note: { fontSize: 12, color: colors.textSecondary, flexShrink: 1 },
  notice: {
    fontSize: 12,
    color: colors.textPrimary,
    backgroundColor: colors.warningLight,
    padding: 10,
    borderRadius: 10,
  },
  error: { fontSize: 12, color: colors.danger },
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
  methodRow: { flexDirection: 'row', gap: 8 },
  methodBtn: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  methodBtnOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  methodText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  methodTextOn: { color: colors.textWhite },
  field: { gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.textPrimary },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    color: colors.textPrimary,
    backgroundColor: colors.card,
  },
  inputError: { borderColor: colors.danger },
  secureRow: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  summary: { backgroundColor: colors.surface, borderRadius: 12, padding: 12, gap: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  summaryLabel: { fontSize: 12, color: colors.textSecondary },
  summaryValue: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, flexShrink: 1 },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnOff: { opacity: 0.5 },
  primaryBtnText: { color: colors.textWhite, fontWeight: '800', fontSize: 14 },
  linkBtn: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  linkBtnText: { color: colors.primary, fontWeight: '700' },
});
