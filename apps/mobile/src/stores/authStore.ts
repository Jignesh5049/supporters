import { create } from 'zustand';
import type { Me } from '@supporters/shared';
import { saveAuthTokens, clearAuthTokens } from '../lib/storage/secureStore';

export interface AuthSession {
  user: Me;
  token: string;
}

interface AuthState {
  user: Me | null;
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (session: AuthSession | null) => void;
  setUser: (user: Me | null) => void;
  updateUser: (partial: Partial<Me>) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
  setSession: (session) => {
    if (session?.token) {
      saveAuthTokens(session.token).catch(() => {});
    }
    set({
      session,
      user: session ? session.user : null,
      isAuthenticated: !!session,
    });
  },
  setUser: (user) =>
    set((state) => ({
      user,
      session: state.session ? { ...state.session, user: user || state.session.user } : null,
    })),
  updateUser: (partial) =>
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...partial };
      return {
        user: updatedUser,
        session: state.session ? { ...state.session, user: updatedUser } : null,
      };
    }),
  signOut: () => {
    clearAuthTokens().catch(() => {});
    set({
      user: null,
      session: null,
      isAuthenticated: false,
    });
  },
}));
