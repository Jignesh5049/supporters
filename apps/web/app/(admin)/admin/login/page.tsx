import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminLoginForm } from '@/features/admin/admin-login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <AdminLoginForm />
    </Suspense>
  );
}
