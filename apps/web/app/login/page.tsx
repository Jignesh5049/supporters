'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@supporters/ui-web/components/button';
import { ArrowRight } from 'lucide-react';
import { useLogin } from '@/features/auth/auth-api';
import { loginFormSchema } from '@/features/auth/auth-forms';
import { FormError, FormField } from '@/features/auth/form-field';
import { safeNextPath } from '@/lib/auth/session-cookies';
import { errorMessage } from '@/lib/api/errors';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const login = useLogin(safeNextPath(searchParams.get('next')));
  const form = useForm({ resolver: zodResolver(loginFormSchema) });
  const { errors } = form.formState;

  // A failure is shown from `login.error`.
  const handleSubmit = form.handleSubmit((input) =>
    login.mutateAsync(input).catch(() => undefined),
  );

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
            <h1 className="text-2xl font-black text-[#111111]">Sign In to Supporters</h1>
            <p className="text-xs text-[#667085]">
              Access your B2B network, buyer enquiries, and business catalogue
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FormField
              label="Mobile number or email"
              autoComplete="username"
              placeholder="+91 98765 43210"
              error={errors.identifier?.message}
              {...form.register('identifier')}
            />
            <FormField
              label="Password"
              type="password"
              autoComplete="current-password"
              error={errors.password?.message}
              labelAside={
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              }
              {...form.register('password')}
            />
            <FormError message={login.error ? errorMessage(login.error) : null} />
            <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
              {login.isPending ? 'Signing in...' : 'Sign In to Supporters'}
              <ArrowRight />
            </Button>
          </form>

          {/* Footer */}
          <div className="pt-2 text-center text-xs text-[#667085]">
            <span>Don&apos;t have an account yet? </span>
            <Link href="/register" className="font-bold text-[#2E3192] hover:underline">
              Register your Business
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
