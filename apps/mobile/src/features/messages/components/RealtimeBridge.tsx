import { useCallback } from 'react';
import { chatApi } from '../../../lib/api';
import { realtime } from '../../../lib/socket';
import { useRealtimeConnection } from '../../../lib/socket/use-realtime-connection';
import { useViewerId } from '../../social/use-viewer';
import { useRealtimeChatSync } from '../realtime-sync';

/** Keeps the socket open while it should be and feeds its events into the Query cache. */
export function RealtimeBridge() {
  const viewerId = useViewerId();
  const fetchAfter = useCallback(
    (conversationId: string, after: string) => chatApi.messages(conversationId, { after }),
    [],
  );
  useRealtimeConnection();
  useRealtimeChatSync(realtime, viewerId, fetchAfter);
  return null;
}
