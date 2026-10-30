'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CURRENT_POLICY_VERSION, OtpPurpose, RATE_LIMITS } from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { ShieldCheck, ArrowRight, RotateCcw, Edit2 } from 'lucide-react';
import { useRegister, useSendOtp } from '@/features/auth/auth-api';
import { otpFormSchema } from '@/features/auth/auth-forms';
import { FormError, FormField } from '@/features/auth/form-field';
import { formatPhone, pendingFlow } from '@/features/auth/pending-flow';
import { errorMessage } from '@/lib/api/errors';

export default function VerifyOtpPage() {
  const [signup] = useState(pendingFlow.getSignup);
  const register = useRegister('/onboarding');
  const resend = useSendOtp();
  const [resendIn, setResendIn] = useState<number>(RATE_LIMITS.otpSendCooldownSec);
  const form = useForm({ resolver: zodResolver(otpFormSchema) });

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const handleVerify = form.handleSubmit(async ({ otp }) => {
    if (!signup) return;
    const isRegistered = await register
      .mutateAsync({ ...signup, otp, policyVersion: CURRENT_POLICY_VERSION })
      .then(
        () => true,
        () => false,
      );
    // The password only lives here until the account exists.
    if (isRegistered) pendingFlow.setSignup(null);
  });

  const handleResend = () => {
    if (!signup) return;
    resend.mutate(
      { purpose: OtpPurpose.Signup, phone: signup.phone },
      { onSuccess: ({ resendAfter }) => setResendIn(resendAfter) },
    );
  };

  const error = register.error ?? resend.error;

  return (
    <div className="w-full min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-3">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full p-8 shadow-sm space-y-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2E3192] flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <div>
            <h1 className="text-xl font-black text-[#111111]">Verify Your Contact</h1>
            <p className="text-xs text-[#667085] mt-1">
              {signup ? (
                <>
                  We sent a 6-digit confirmation code to{' '}
                  <strong>{formatPhone(signup.phone)}</strong>
                </>
              ) : (
                'Your sign-up details were cleared. Start again to get a new code.'
              )}
            </p>
          </div>

          {signup && (
            <form onSubmit={handleVerify} noValidate className="space-y-6 text-left">
              <FormField
                label="Confirmation code"
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                className="h-12 text-center text-lg font-bold tracking-widest"
                error={form.formState.errors.otp?.message}
                {...form.register('otp')}
              />
              <FormError message={error ? errorMessage(error) : null} />
              <Button type="submit" size="lg" className="w-full" disabled={register.isPending}>
                {register.isPending ? 'Verifying...' : 'Confirm & Proceed'}
                <ArrowRight />
              </Button>
            </form>
          )}

          <div className="pt-2 flex items-center justify-between text-xs text-[#667085] border-t border-[#E5E7EB]">
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={handleResend}
              disabled={!signup || resendIn > 0 || resend.isPending}
            >
              <RotateCcw />
              {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend Code'}
            </Button>

            <Link
              href="/register"
              className="flex items-center gap-1 font-semibold hover:text-[#111111]"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>{signup ? 'Change Number' : 'Start again'}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
