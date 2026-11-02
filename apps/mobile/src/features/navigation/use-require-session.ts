import { router } from 'expo-router';
import { useCallback } from 'react';
import { useApp } from '../../context/AppContext';

/**
 * Runs a protected action (enquire, follow, save) for a signed-in user. A guest is asked to sign
 * in first, the same way navigate() handles protected screens (mobile spec, Guest access).
 */
export function useRequireSession() {
  const { isAuthenticated, showToast } = useApp();
  return useCallback(
    (action: () => void) => {
      if (isAuthenticated) {
        action();
        return;
      }
      showToast('Sign in to continue', 'info');
      router.push('/sign-in');
    },
    [isAuthenticated, showToast],
  );
}
