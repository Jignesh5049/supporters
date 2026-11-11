'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { adminLoginSchema } from '@supporters/shared';
import { Button } from '@supporters/ui-web/components/button';
import { useMutation } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toE164 } from '@/features/auth/pending-flow';
import { FormError, FormField } from '@/features/auth/form-field';
import { ApiError, errorMessage } from '@/lib/api/errors';
import { safeNextPath } from '@/lib/auth/session-cookies';
import { adminApi } from './admin-api';

const formSchema = adminLoginSchema.extend({
  identifier: adminLoginSchema.shape.identifier.transform(toE164),
});

/** One message for every failure: the API doesn't say which part was wrong either. */
export function adminLoginError(error: unknown): string {
  if (error instanceof ApiError && error.code === 'INVALID_CREDENTIALS') {
    return 'Those details or the code are not right. Codes work once; wait for the next one.';
  }
  return errorMessage(error);
}

/** Password plus the 6-digit authenticator code, at every sign-in (backend spec, Admin). */
export function AdminLoginForm() {
  const next = safeNextPath(useSearchParams().get('next'), '/admin');
  const form = useForm({ resolver: zodResolver(formSchema) });
  const login = useMutation({
    mutationFn: adminApi.login,
    // A full load, so the guarded layout renders with the new cookie.
    onSuccess: () => window.location.assign(next.startsWith('/admin') ? next : '/admin'),
  });
  const { errors } = form.formState;
  const handleSubmit = form.handleSubmit((input) =>
    login.mutateAsync(input).catch(() => undefined),
  );

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <ShieldCheck className="mx-auto size-10 text-primary" aria-hidden />
          <h1 className="text-title font-bold text-foreground">Supporters admin</h1>
          <p className="text-caption text-muted-foreground">
            Sessions last 8 hours. You will need your authenticator app.
          </p>
        </div>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <FormField
            label="Mobile number or email"
            autoComplete="username"
            error={errors.identifier?.message}
            {...form.register('identifier')}
          />
          <FormField
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...form.register('password')}
          />
          <FormField
            label="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            error={errors.code?.message}
            {...form.register('code')}
          />
          <FormError message={login.error ? adminLoginError(login.error) : null} />
          <Button type="submit" size="lg" className="w-full" disabled={login.isPending}>
            {login.isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
