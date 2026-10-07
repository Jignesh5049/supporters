'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Route paths that are standalone authentication/onboarding pages
  const isAuthRoute = [
    '/login',
    '/register',
    '/verify',
    '/forgot-password',
    '/reset-password',
    '/onboarding'
  ].includes(pathname);

  if (isAuthRoute) {
    return <main className="flex-1 flex flex-col">{children}</main>;
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 lg:pb-6 flex gap-6 items-start">
      {/* Persistent Sticky Sidebar */}
      <Sidebar />

      {/* Main Page Area */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
