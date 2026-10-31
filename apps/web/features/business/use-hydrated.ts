import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * False in the server HTML and until React hydrates. Forms keep submit
 * disabled until then: before hydration a click would do a native GET submit
 * and put the field values in the URL.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
