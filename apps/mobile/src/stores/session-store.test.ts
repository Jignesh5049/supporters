import type { Me } from '@supporters/shared';
import { SessionStatus, useSessionStore } from './session-store';

const ME: Me = {
  id: '6f1c2c1e-8d0e-4c5a-9b1f-2a3b4c5d6e7f',
  name: 'Asha Patel',
  phone: '+919876543210',
  email: null,
  emailVerified: false,
  role: 'user',
  cityId: null,
  createdAt: '2026-10-30T10:00:00.000Z',
};

const initialState = useSessionStore.getState();

describe('useSessionStore', () => {
  beforeEach(() => useSessionStore.setState(initialState, true));

  it('starts restoring, with no user', () => {
    expect(useSessionStore.getState()).toMatchObject({
      status: SessionStatus.Restoring,
      user: null,
      isUpgradeRequired: false,
    });
  });

  it('moves between signed in and guest', () => {
    useSessionStore.getState().setSignedIn(ME);
    expect(useSessionStore.getState()).toMatchObject({ status: SessionStatus.SignedIn, user: ME });

    useSessionStore.getState().setGuest();
    expect(useSessionStore.getState()).toMatchObject({ status: SessionStatus.Guest, user: null });
  });

  it('keeps the upgrade flag after sign-out', () => {
    useSessionStore.getState().setUpgradeRequired();
    useSessionStore.getState().setGuest();
    expect(useSessionStore.getState().isUpgradeRequired).toBe(true);
  });

  it('never holds tokens', () => {
    useSessionStore.getState().setSignedIn(ME);
    const serialized = JSON.stringify(useSessionStore.getState());
    expect(serialized).not.toMatch(/token/i);
  });
});
