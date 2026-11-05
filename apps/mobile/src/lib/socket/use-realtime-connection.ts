import { useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { SessionStatus, useSessionStore } from '../../stores/session-store';
import { realtime } from './index';

/**
 * One socket while signed in and in the foreground; none in the background, where push takes
 * over (mobile spec, Realtime). Mounted once, in the root layout.
 */
export function useRealtimeConnection() {
  const status = useSessionStore((state) => state.status);
  const userId = useSessionStore((state) => state.user?.id ?? null);

  useEffect(() => {
    if (status !== SessionStatus.SignedIn || !userId) {
      realtime.stop();
      return undefined;
    }
    const apply = (state: AppStateStatus) => {
      if (state === 'active') void realtime.start();
      // 'inactive' is a passing state on iOS (Control Centre, app switcher): keep the socket.
      else if (state === 'background') realtime.stop();
    };
    // currentState can be unknown right at launch; the app is in front then.
    apply(AppState.currentState === 'background' ? 'background' : 'active');
    const subscription = AppState.addEventListener('change', apply);
    return () => {
      subscription.remove();
      realtime.stop();
    };
  }, [status, userId]);
}
