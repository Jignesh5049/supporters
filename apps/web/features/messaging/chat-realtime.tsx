'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { getChatSocket } from '@/lib/socket/browser-chat-socket';
import { bindChatToCache } from './chat-queries';

/** A stop waits one tick, so an immediate remount (Strict Mode, a layout swap) keeps the socket. */
let pendingStop: ReturnType<typeof setTimeout> | undefined;

/**
 * Opens the tab's chat connection while signed in and feeds it into the
 * query cache. Signing out (the server render passes `false`) disconnects
 * and clears the outbox.
 */
export function ChatRealtime({ isSignedIn }: { isSignedIn: boolean }) {
  const client = useQueryClient();
  useEffect(() => {
    if (!isSignedIn) return;
    clearTimeout(pendingStop);
    const chat = getChatSocket();
    const unbind = bindChatToCache(chat, client);
    chat.start();
    return () => {
      unbind();
      pendingStop = setTimeout(() => chat.stop(), 0);
    };
  }, [client, isSignedIn]);
  return null;
}
