import { useCallback } from 'react';
import { router } from 'expo-router';
import { useApp } from '../../context/AppContext';
import { SessionStatus, useSessionStore } from '../../stores/session-store';

/**
 * Guests may browse but not act (mobile spec, Guest access). Wraps an action:
 * signed in it runs; as a guest it opens sign-in instead.
 */
export function useRequireAuth() {
  const isSignedIn = useSessionStore((state) => state.status === SessionStatus.SignedIn);
  const { showToast } = useApp();
  return useCallback(
    (action: () => void) => {
      if (isSignedIn) {
        action();
        return;
      }
      showToast('Sign in to continue', 'info');
      router.push('/sign-in');
    },
    [isSignedIn, showToast],
  );
}
