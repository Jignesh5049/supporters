'use client';

import { useCallback, useEffect, useRef } from 'react';
import { createSeenBatcher } from './seen-batcher';
import { socialApi } from './social-api';

/** A post counts as seen once half of it has been on screen for a second (web spec, Analytics). */
const VISIBLE_RATIO = 0.5;
const VISIBLE_MS = 1_000;
const FLUSH_EVERY_MS = 10_000;

/**
 * Returns a ref callback for each feed card (which carries `data-post-id`).
 * Signed-in viewers only: guests have no seen list. Batches go out every 10 s
 * and when the page is hidden.
 */
export function useFeedSeen(isEnabled: boolean) {
  const batcher = useRef(createSeenBatcher((ids) => socialApi.markSeen(ids)));
  const timers = useRef(new Map<Element, ReturnType<typeof setTimeout>>());
  const observer = useRef<IntersectionObserver | null>(null);

  // Refs attach before effects run, so the observer is created on first use.
  const getObserver = useCallback(() => {
    observer.current ??= new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const postId = (entry.target as HTMLElement).dataset.postId;
          if (!postId) continue;
          if (entry.isIntersecting && !timers.current.has(entry.target)) {
            timers.current.set(
              entry.target,
              setTimeout(() => batcher.current.add(postId), VISIBLE_MS),
            );
          } else if (!entry.isIntersecting) {
            clearTimeout(timers.current.get(entry.target));
            timers.current.delete(entry.target);
          }
        }
      },
      { threshold: VISIBLE_RATIO },
    );
    return observer.current;
  }, []);

  useEffect(() => {
    if (!isEnabled) return;
    // The observer itself outlives this effect: each card's ref cleanup unobserves it.
    const current = batcher.current;
    const interval = setInterval(() => current.flush(), FLUSH_EVERY_MS);
    const onHide = () => {
      if (document.visibilityState === 'hidden') current.flush();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onHide);
      current.flush();
    };
  }, [isEnabled]);

  return useCallback(
    (element: HTMLElement | null) => {
      if (!element || !isEnabled) return;
      const target = getObserver();
      target.observe(element);
      return () => {
        target.unobserve(element);
        clearTimeout(timers.current.get(element));
        timers.current.delete(element);
      };
    },
    [isEnabled, getObserver],
  );
}
