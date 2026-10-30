import { Suspense, type ReactNode } from 'react';
import { requireSession } from '@/dal/session';

/** Onboarding needs an account: the DAL check, not just the proxy's optimistic redirect. */
async function SessionGate({ children }: { children: ReactNode }) {
  await requireSession('/onboarding');
  return children;
}

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  // The session is request data, so it streams in behind a boundary (Cache Components).
  return (
    <Suspense fallback={null}>
      <SessionGate>{children}</SessionGate>
    </Suspense>
  );
}
