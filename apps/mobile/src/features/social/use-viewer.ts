import { SessionStatus, useSessionStore } from '../../stores/session-store';

/** The signed-in user's id, or null for guests (and while the session restores). */
export function useViewerId(): string | null {
  return useSessionStore((state) =>
    state.status === SessionStatus.SignedIn ? (state.user?.id ?? null) : null,
  );
}
