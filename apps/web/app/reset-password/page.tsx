'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ACCOUNT_LIMITS } from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useResetPassword } from '@/features/auth/auth-api';
import { resetPasswordFormSchema } from '@/features/auth/auth-forms';
import { FormError, FormField } from '@/features/auth/form-field';
import { formatPhone, pendingFlow } from '@/features/auth/pending-flow';
import { errorMessage } from '@/lib/api/errors';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { showToast } = useApp();
  const [phone] = useState(pendingFlow.getResetPhone);
  const resetPassword = useResetPassword();
  const form = useForm({ resolver: zodResolver(resetPasswordFormSchema) });
  const { errors } = form.formState;

  const handleSubmit = form.handleSubmit(async ({ otp, newPassword }) => {
    if (!phone) return;
    const isReset = await resetPassword.mutateAsync({ phone, otp, newPassword }).then(
      () => true,
      () => false,
    );
    if (!isReset) return;
    pendingFlow.setResetPhone(null);
    showToast('Your password has been updated. Sign in with it now.', 'success');
    router.push('/login');
  });

  return (
    <div className="w-full min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-3">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-black text-[#111111]">Set New Password</h1>
            <p className="text-xs text-[#667085]">
              {phone
                ? `Enter the code sent to ${formatPhone(phone)} and choose a password of at least ${ACCOUNT_LIMITS.password.min} characters.`
                : 'Your reset request was cleared. Request a new code to continue.'}
            </p>
          </div>

          {phone ? (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <FormField
                label="Code"
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                error={errors.otp?.message}
                {...form.register('otp')}
              />
              <FormField
                label="New password"
                type="password"
                autoComplete="new-password"
                error={errors.newPassword?.message}
                {...form.register('newPassword')}
              />
              <FormField
                label="Confirm new password"
                type="password"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...form.register('confirmPassword')}
              />
              <FormError message={resetPassword.error ? errorMessage(resetPassword.error) : null} />
              <Button type="submit" size="lg" className="w-full" disabled={resetPassword.isPending}>
                {resetPassword.isPending ? 'Updating...' : 'Update Password'}
                <ArrowRight />
              </Button>
            </form>
          ) : (
            <Button asChild size="lg" className="w-full">
              <Link href="/forgot-password">Request a new code</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
