'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { OtpPurpose } from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { ArrowRight } from 'lucide-react';
import { useSendOtp } from '@/features/auth/auth-api';
import { registerFormSchema } from '@/features/auth/auth-forms';
import { FormError, FormField } from '@/features/auth/form-field';
import { pendingFlow } from '@/features/auth/pending-flow';
import { errorMessage } from '@/lib/api/errors';

export default function RegisterPage() {
  const router = useRouter();
  const sendOtp = useSendOtp();
  const form = useForm({ resolver: zodResolver(registerFormSchema) });
  const { errors } = form.formState;

  // An invite link (/register?ref=CODE) prefills the code. Read after hydration, not during it.
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref');
    if (ref) form.setValue('referralCode', ref.slice(0, 16));
  }, [form]);

  const handleSubmit = form.handleSubmit(async ({ name, phone, password, referralCode }) => {
    // A failure is shown from `sendOtp.error`.
    const isSent = await sendOtp.mutateAsync({ purpose: OtpPurpose.Signup, phone }).then(
      () => true,
      () => false,
    );
    if (!isSent) return;
    pendingFlow.setSignup({ name, phone, password, ...(referralCode ? { referralCode } : {}) });
    router.push('/verify');
  });

  return (
    <div className="w-full min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-3">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full p-8 shadow-sm space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-[#2E3192] text-white flex items-center justify-center mx-auto shadow-xs">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path
                  d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5zm-1 16l-4-4 1.41-1.41L11 15.17l6.59-6.59L19 10l-8 8z"
                  fill="#00AEEF"
                />
                <circle cx="12" cy="12" r="3" fill="#FFFFFF" />
              </svg>
            </div>
            <h1 className="text-2xl font-black text-[#111111]">Join Supporters</h1>
            <p className="text-xs text-[#667085]">
              Create your account to discover suppliers and expand your commerce network
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FormField
              label="Full name"
              autoComplete="name"
              placeholder="e.g. Ramesh Patel"
              error={errors.name?.message}
              {...form.register('name')}
            />
            <FormField
              label="Mobile number"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder="+91 98765 43210"
              error={errors.phone?.message}
              {...form.register('phone')}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                label="Password"
                type="password"
                autoComplete="new-password"
                error={errors.password?.message}
                {...form.register('password')}
              />
              <FormField
                label="Confirm password"
                type="password"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...form.register('confirmPassword')}
              />
            </div>

            <FormField
              label="Referral code (optional)"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="From a friend's invite"
              error={
                errors.referralCode?.message
                  ? 'Enter the 8-character code, or leave it empty'
                  : undefined
              }
              {...form.register('referralCode')}
            />

            <p className="text-xs text-muted-foreground">
              By continuing you agree to our{' '}
              <Link href="/terms" className="text-primary underline-offset-4 hover:underline">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>

            <FormError message={sendOtp.error ? errorMessage(sendOtp.error) : null} />
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? 'Sending code...' : 'Create Supporters Account'}
              <ArrowRight />
            </Button>
          </form>

          <div className="pt-2 text-center text-xs text-[#667085]">
            <span>Already have an account? </span>
            <Link href="/login" className="font-bold text-[#2E3192] hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
