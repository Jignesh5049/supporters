import type { Me } from '@supporters/shared';
import { create } from 'zustand';

export const SessionStatus = {
  Restoring: 'restoring',
  Guest: 'guest',
  SignedIn: 'signedIn',
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

/** UI state only. Tokens never enter this store (they stay in SecureStore). */
interface SessionState {
  status: SessionStatus;
  user: Me | null;
  isUpgradeRequired: boolean;
  setSignedIn: (user: Me) => void;
  setGuest: () => void;
  setUpgradeRequired: () => void;
}

export const useSessionStore = create<SessionState>()((set) => ({
  status: SessionStatus.Restoring,
  user: null,
  isUpgradeRequired: false,
  setSignedIn: (user) => set({ status: SessionStatus.SignedIn, user }),
  setGuest: () => set({ status: SessionStatus.Guest, user: null }),
  setUpgradeRequired: () => set({ isUpgradeRequired: true }),
}));
