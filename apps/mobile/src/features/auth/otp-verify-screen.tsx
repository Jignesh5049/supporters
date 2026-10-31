import { OTP, OtpPurpose, RATE_LIMITS, otpCodeSchema } from '@supporters/shared';
import { Button } from '@supporters/ui-native/components/button';
import { Input } from '@supporters/ui-native/components/input';
import { Label } from '@supporters/ui-native/components/label';
import { Text } from '@supporters/ui-native/components/text';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { type PendingOtp, useAuthFlowStore } from '../../stores/auth-flow-store';

const formatPhone = (phone: string) =>
  `${phone.slice(0, 3)} ${phone.slice(3, 8)} ${phone.slice(8)}`;

export function OtpVerifyScreen() {
  const { goBack, signUp, requestOtp, showToast } = useApp();
  // What the screen before set; it stays in memory and is never persisted.
  const params: Partial<PendingOtp> = useAuthFlowStore((state) => state.pendingOtp) ?? {};
  const setVerifiedReset = useAuthFlowStore((state) => state.setVerifiedReset);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendIn, setResendIn] = useState<number>(RATE_LIMITS.otpSendCooldownSec);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const isMissingParams = !params.phone || !params.purpose;
  useEffect(() => {
    // Reached without a phone number: send the user back to start the flow again.
    if (isMissingParams) goBack();
  }, [isMissingParams, goBack]);

  if (!params.phone || !params.purpose) return null;
  const { phone, purpose } = params;

  const handleChange = (value: string) => {
    setCode(value.replace(/\D/g, '').slice(0, OTP.digits));
    setError(null);
  };

  const handleVerify = async () => {
    if (!otpCodeSchema.safeParse(code).success) {
      setError(`Enter the ${OTP.digits}-digit code`);
      return;
    }
    if (purpose === OtpPurpose.Reset) {
      // The reset endpoint checks the code together with the new password.
      setVerifiedReset({ phone, otp: code });
      router.dismissTo('/forgot-password');
      return;
    }
    setIsSubmitting(true);
    const result = await signUp({
      name: params.name ?? '',
      phone,
      password: params.password ?? '',
      otp: code,
    });
    setIsSubmitting(false);
    if (result.success) {
      showToast('Account created. Welcome to Supporters!', 'success');
    } else {
      setError(result.error ?? 'Something went wrong. Try again.');
    }
  };

  const handleResend = async () => {
    setError(null);
    setResendIn(RATE_LIMITS.otpSendCooldownSec);
    const result = await requestOtp(purpose, phone);
    if (result.success) {
      showToast('We sent a new code', 'info');
    } else {
      setError(result.error ?? 'Something went wrong. Try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="bg-background flex-1"
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-4 py-6"
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full max-w-md gap-6 self-center">
          <View className="gap-2">
            <Text variant="h3" className="text-center">
              Enter the code
            </Text>
            <Text variant="muted" className="text-center">
              We sent a {OTP.digits}-digit code by SMS to {formatPhone(phone)}.
            </Text>
          </View>

          <View className="gap-2">
            <Label nativeID="otp-label">One-time code</Label>
            <Input
              aria-labelledby="otp-label"
              accessibilityLabel="One-time code"
              value={code}
              onChangeText={handleChange}
              keyboardType="number-pad"
              // iOS offers the code from Messages; Android fills it from the SMS.
              textContentType="oneTimeCode"
              autoComplete={Platform.OS === 'android' ? 'sms-otp' : 'one-time-code'}
              maxLength={OTP.digits}
              autoFocus
              editable={!isSubmitting}
              onSubmitEditing={handleVerify}
              className="h-12 text-center text-xl tracking-widest"
            />
            {error && (
              <Text className="text-destructive text-sm" role="alert">
                {error}
              </Text>
            )}
          </View>

          <Button size="lg" onPress={handleVerify} disabled={isSubmitting}>
            {isSubmitting ? <ActivityIndicator /> : <Text>Verify</Text>}
          </Button>

          <View className="items-center gap-1">
            <Button
              variant="link"
              onPress={handleResend}
              disabled={resendIn > 0 || isSubmitting}
              accessibilityHint="Sends a new code by SMS"
            >
              <Text>{resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}</Text>
            </Button>
            <Button variant="ghost" onPress={goBack} disabled={isSubmitting}>
              <Text>Change number</Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
