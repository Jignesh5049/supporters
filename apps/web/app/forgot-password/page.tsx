'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { OtpPurpose } from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import { useSendOtp } from '@/features/auth/auth-api';
import { forgotPasswordFormSchema } from '@/features/auth/auth-forms';
import { FormError, FormField } from '@/features/auth/form-field';
import { pendingFlow } from '@/features/auth/pending-flow';
import { errorMessage } from '@/lib/api/errors';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const sendOtp = useSendOtp();
  const form = useForm({ resolver: zodResolver(forgotPasswordFormSchema) });

  const handleSubmit = form.handleSubmit(async ({ phone }) => {
    // The API answers the same whether or not the number has an account.
    const isSent = await sendOtp.mutateAsync({ purpose: OtpPurpose.Reset, phone }).then(
      () => true,
      () => false,
    );
    if (!isSent) return;
    pendingFlow.setResetPhone(phone);
    router.push('/reset-password');
  });

  return (
    <div className="w-full min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-3">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#2E3192] flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black text-[#111111]">Reset Password</h1>
            <p className="text-xs text-[#667085]">
              Enter your registered mobile number and we will text you a code.
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FormField
              label="Mobile number"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+91 98765 43210"
              error={form.formState.errors.phone?.message}
              {...form.register('phone')}
            />
            <FormError message={sendOtp.error ? errorMessage(sendOtp.error) : null} />
            <Button type="submit" size="lg" className="w-full" disabled={sendOtp.isPending}>
              {sendOtp.isPending ? 'Sending code...' : 'Send Code'}
              <ArrowRight />
            </Button>
          </form>

          <div className="pt-2 text-center text-xs">
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-[#667085] hover:text-[#111111]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
